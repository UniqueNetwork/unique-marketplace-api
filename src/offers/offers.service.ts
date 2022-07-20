import { BadRequestException, HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { Connection } from 'typeorm';

import { TypeAttributToken, Bid } from '../types';

import { OfferTraits, OfferEntityDto, OffersFilter, OfferAttributesDto, OfferAttributes, TraitDto } from './dto';
import { SearchIndex, OffersEntity, AuctionBidEntity } from '../entity';

import { PaginationRequest } from '../utils/pagination/pagination-request';
import { PaginationResultDto } from '../utils/pagination/pagination-result';
import { OfferSortingRequest } from '../utils/sorting/sorting-request';
import { InjectSentry, SentryService } from '../utils/sentry';
import { OffersFilterService } from './offers-filter.service';
import { OffersFilterType, OffersItemType } from './types';
import { BidStatus } from '../types';

@Injectable()
export class OffersService {
  private logger: Logger;

  constructor(
    @Inject('DATABASE_CONNECTION') private connection: Connection,
    @InjectSentry() private readonly sentryService: SentryService,
    private readonly offersFilterService: OffersFilterService,
  ) {
    this.logger = new Logger(OffersService.name);
  }
  /**
   * Get Offers
   * @description Returns sales offers in JSON format
   * @param {PaginationRequest} pagination - Paginate {page: 1, pageSize: 10}
   * @param {OffersFilter} offersFilter - DTO Offer filter
   * @param {OfferSortingRequest} sort - Possible values: asc(Price), desc(Price), asc(TokenId), desc(TokenId), asc(CreationDate), desc(CreationDate)
   */
  async get(
    pagination: PaginationRequest,
    offersFilter: OffersFilter,
    sort: OfferSortingRequest,
  ): Promise<PaginationResultDto<OfferEntityDto>> {
    let offers;
    let items = [];
    let auctionIds: Array<number> = [];
    let bids = [];
    let searchIndex = [];

    try {
      offers = await this.offersFilterService.filter(offersFilter, pagination, sort);
      auctionIds = this.auctionIds(offers.items);
      bids = await this.bids(auctionIds);
      searchIndex = await this.searchIndex(this.parserCollectionIdTokenId(offers.items));
      items = this.parseItems(offers.items, bids, searchIndex) as any as Array<OffersEntity>;
    } catch (e) {
      this.logger.error(e.message);
      this.sentryService.instance().captureException(new BadRequestException(e), {
        tags: { section: 'contract_ask' },
      });
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Something went wrong!',
        error: e.message,
      });
    }

    return new PaginationResultDto(OfferEntityDto, {
      page: offers.page,
      pageSize: offers.pageSize,
      itemsCount: offers.itemsCount,
      items: items.map(OfferEntityDto.fromOffersEntity),
      attributes: offers.attributes as Array<TraitDto>,
      attributesCount: offers.attributesCount,
    });
  }

  private auctionIds(items: Array<any>): Array<number> {
    return items.filter((item) => item?.auction_id !== null).map((item) => item?.auction_id);
  }

  private async bids(auctionIds: Array<number>): Promise<Array<Partial<Bid>>> {
    const queryBuilder = this.connection.manager
      .createQueryBuilder(AuctionBidEntity, 'bid')
      .select(['created_at', 'updated_at', 'amount', 'auction_id', 'bidder_address', 'balance', 'status'])
      .where('bid.amount > 0')
      .andWhere('bid.status != :status', { status: BidStatus.error });

    if (Array.isArray(auctionIds) && auctionIds?.length > 0) {
      queryBuilder.andWhere('bid.auction_id in (:...auctionIds)', {
        auctionIds,
      });
    }

    const source = await queryBuilder.execute();

    return source.map((item) => {
      return {
        createdAt: item.created_at,
        updatedAt: item.updated_at,
        auctionId: item.auction_id,
        balance: item.balance,
        amount: item.amount,
        bidderAddress: item.bidder_address,
      };
    });
  }

  private parserCollectionIdTokenId(items: Array<any>): string | null {
    const values = items.map((item) => {
      return `(${Number(item.collection_id)}, ${Number(item.token_id)})`;
    });
    if (values.length > 0) {
      return `select * from (values ${values.join(',')}) as t (collection_id, token_id)`;
    }
    return null;
  }

  private async searchIndex(sqlValues: string): Promise<Array<Partial<SearchIndex>>> {
    if (sqlValues) {
      const result = await this.connection.manager.query(
        `select
            si.collection_id,
            si.token_id,
            items,
            type,
            key
        from search_index si  inner join (${sqlValues}) t on
        t.collection_id = si.collection_id and
        t.token_id = si.token_id;`,
      );
      return result as Array<Partial<SearchIndex>>;
    }
    return [];
  }

  private parseSearchIndex(): (
    previousValue: { attributes: any[] },
    currentValue: Partial<SearchIndex>,
    currentIndex: number,
    array: Partial<SearchIndex>[],
  ) => { attributes: any[] } {
    return (acc, item) => {
      if (item.type === TypeAttributToken.Prefix) {
        acc['prefix'] = item.items.pop();
      }

      if (item.key === 'collectionName') {
        acc['collectionName'] = item.items.pop();
      }

      if (item.key === 'description') {
        acc['description'] = item.items.pop();
      }

      if (item.type === TypeAttributToken.ImageURL) {
        const image = String(item.items.pop());
        if (image.search('ipfs.unique.network') !== -1) {
          acc[`${item.key}`] = image;
        } else {
          if (image.search('https://') !== -1 && image.search('http://') !== 0) {
            acc[`${item.key}`] = image;
          } else {
            if (image) {
              acc[`${item.key}`] = `https://ipfs.unique.network/ipfs/${image}`;
            } else {
              acc[`${item.key}`] = null;
            }
          }
        }
      }

      if (
        (item.type === TypeAttributToken.String || item.type === TypeAttributToken.Enum) &&
        !['collectionName', 'description'].includes(item.key)
      ) {
        acc.attributes.push({
          key: item.key,
          value: item.items.length === 1 ? item.items.pop() : item.items,
          type: item.type,
        });
      }

      return acc;
    };
  }

  private parseItems(items: Array<OffersFilterType>, bids: Partial<Bid>[], searchIndex: Partial<SearchIndex>[]): Array<OffersItemType> {
    const parseSearchIndex = this.parseSearchIndex;

    function convertorFlatToObject(): (previousValue: any, currentValue: any, currentIndex: number, array: any[]) => any {
      return (acc, item) => {
        const obj = {
          collection_id: +item.collection_id,
          token_id: +item.token_id,
          price: item.offer_price,
          currency: +item.offer_currency,
          address_from: item.offer_address_from,
          created_at: new Date(item.offer_created_at_ask),
          auction: null,
          tokenDescription: searchIndex
            .filter((index) => index.collection_id === item.collection_id && index.token_id === item.token_id)
            .reduce(parseSearchIndex(), {
              attributes: [],
            }),
        };

        if (item.auction_id) {
          obj.auction = Object.assign(
            {},
            {
              id: item.auction_id,
              createdAt: new Date(item.auction_created_at),
              updatedAt: new Date(item.auction_updated_at),
              priceStep: item.auction_price_step,
              startPrice: item.auction_start_price,
              status: item.auction_status,
              stopAt: new Date(item.auction_stop_at),
              bids: bids.filter((bid) => bid.auctionId === item.auction_id) as any as AuctionBidEntity[],
            },
          );
        }

        acc.push(obj);
        return acc;
      };
    }

    return items.reduce(convertorFlatToObject(), []);
  }

  async getOne(filter: { collectionId: number; tokenId: number }): Promise<OfferEntityDto | null> {
    const { collectionId, tokenId } = filter;

    const source = await this.offersFilterService.filterByOne(collectionId, tokenId);
    const bids = await this.bids(this.auctionIds(source));

    const searchIndex = await this.searchIndex(this.parserCollectionIdTokenId(source));

    const offers = this.parseItems(source, bids, searchIndex).pop() as any as OffersEntity;

    return offers && OfferEntityDto.fromOffersEntity(offers);
  }

  public get isConnected(): boolean {
    return true;
  }

  async getAttributes(collectionId: number): Promise<OfferTraits | null> {
    try {
      return this.offersFilterService.attributes(collectionId);
    } catch (e) {
      this.logger.error(e.message);
      this.sentryService.instance().captureException(new BadRequestException(e), {
        tags: { section: 'get_traits' },
      });
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Something went wrong!',
        error: e.message,
      });
    }
  }

  async getAttributesCounts(args: OfferAttributesDto): Promise<Array<OfferAttributes>> {
    try {
      if ((args.collectionId ?? []).length <= 0) {
        throw new BadRequestException({
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Not found collectionIds. Please set collectionIds',
        });
      }
      return this.offersFilterService.attributesCount(args.collectionId);
    } catch (e) {
      this.logger.error(e.message);
    }
  }
}
