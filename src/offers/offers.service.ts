import { BadRequestException, HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { Connection, Repository, SelectQueryBuilder } from 'typeorm';

import { TypeAttributToken, Bid } from '../auction/types';

import { OffersQuerySortHelper } from './offers-query-sort-helper';
import { OfferTraits, OfferContractAskDto, filterAttributes, OffersFilter, OfferAttributesDto, OfferAttributes, TraitDto } from './dto';
import { BlockchainBlock, ContractAsk, SearchIndex, AuctionEntity, BidEntity } from '../entity';

import { PaginationRequest } from '../utils/pagination/pagination-request';
import { PaginationResultDto } from '../utils/pagination/pagination-result';
import { OfferSortingRequest } from '../utils/sorting/sorting-request';
import { nullOrWhitespace } from '../utils/string/null-or-white-space';
import { priceTransformer } from '../utils/price-transformer';
import { InjectSentry, SentryService } from '../utils/sentry';
import { OffersFilterService } from './offers-filter.service';
import { OffersFilterType, OffersItemType } from './types';

type OfferPaginationResult = {
  items: ContractAsk[];
  itemsCount: number;
  page: number;
  pageSize: number;
};

@Injectable()
export class OffersService {
  private logger: Logger;
  private offersQuerySortHelper: OffersQuerySortHelper;

  constructor(
    @Inject('DATABASE_CONNECTION') private connection: Connection,
    @InjectSentry() private readonly sentryService: SentryService,
    private readonly offersFilterService: OffersFilterService,
  ) {
    this.logger = new Logger(OffersService.name);
    this.offersQuerySortHelper = new OffersQuerySortHelper(connection);
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
  ): Promise<PaginationResultDto<OfferContractAskDto>> {
    let offers;
    let items = [];
    let auctionIds: Array<number> = [];
    let bids = [];
    let searchIndex = [];

    try {
      offers = await this.offersFilterService.filter(offersFilter, pagination, sort);
      auctionIds = this.getAuctionIds(offers.items);
      bids = await this.getBids(auctionIds);
      searchIndex = await this.getSearchIndex(this.sqlCollectionIdTokenId(offers.items));
      items = this.parseItems(offers.items, bids, searchIndex) as any as Array<ContractAsk>;
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

    return new PaginationResultDto(OfferContractAskDto, {
      page: offers.page,
      pageSize: offers.pageSize,
      itemsCount: offers.itemsCount,
      items: items.map(OfferContractAskDto.fromContractAsk),
      attributes: offers.attributes as Array<TraitDto>,
      attributesCount: offers.attributesCount,
    });
  }

  private getAuctionIds(items: Array<any>): Array<number> {
    return items.filter((item) => item?.auction_id !== null).map((item) => item?.auction_id);
  }

  private async getBids(auctionIds: Array<number>): Promise<Array<Partial<Bid>>> {
    const queryBuilder = this.connection.manager
      .createQueryBuilder(BidEntity, 'bid')
      .select(['created_at', 'updated_at', 'amount', 'auction_id', 'bidder_address', 'balance'])
      .where('bid.amount > 0');

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

  private sqlCollectionIdTokenId(items: Array<any>): string | null {
    const values = items.map((item) => {
      return `(${Number(item.collection_id)}, ${Number(item.token_id)})`;
    });
    if (values.length > 0) {
      return `select * from (values ${values.join(',')}) as t (collection_id, token_id)`;
    }
    return null;
  }

  private async getSearchIndex(sqlValues: string): Promise<Array<Partial<SearchIndex>>> {
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
          if (image.search('https://') !== -1) {
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
              bids: bids.filter((bid) => bid.auctionId === item.auction_id) as any as BidEntity[],
            },
          );
        }

        acc.push(obj);
        return acc;
      };
    }

    return items.reduce(convertorFlatToObject(), []);
  }

  async setPagination(
    query: SelectQueryBuilder<ContractAsk>,
    paramenter: PaginationRequest,
    sort: OfferSortingRequest,
  ): Promise<OfferPaginationResult> {
    function convertorFlatToObject(): (previousValue: any, currentValue: any, currentIndex: number, array: any[]) => any {
      return (acc, item) => {
        const obj = {
          collection_id: item.offer_collection_id,
          token_id: item.offer_token_id,
          price: item.offer_price,
          currency: +item.offer_currency,
          address_from: item.offer_address_from,
          created_at: item.block_created_at,
          auction: null,
          tokenDescription: {},
        };

        if (item.auction_id) {
          obj.auction = Object.assign(
            {},
            {
              id: item.auction_id,
              createdAt: item.auction_created_at,
              updatedAt: item.auction_updated_at,
              priceStep: item.auction_price_step,
              startPrice: item.auction_start_price,
              status: item.auction_status,
              stopAt: item.auction_stop_at,
              bids: [],
            },
          );
        }

        acc.push(obj);
        return acc;
      };
    }

    const page = paramenter.page ?? 1;
    const pageSize = paramenter.pageSize ?? 10;
    const offset = (page - 1) * pageSize;

    let substitutionQuery = this.connection
      .createQueryBuilder()
      .select([
        'offer_id',
        'offer_status',
        'offer_collection_id',
        'offer_token_id',
        'offer_network',
        'offer_price',
        'offer_currency',
        'offer_address_from',
        'offer_address_to',
        'offer_block_number_ask',
        'offer_block_number_cancel',
        'offer_block_number_buy',
        'auction_id',
        'auction_created_at',
        'auction_updated_at',
        'auction_price_step',
        'auction_start_price',
        'auction_status',
        'auction_stop_at',
        'auction_contract_ask_id',
        'block_block_number',
        'block_created_at',
      ])
      .distinct()
      .from(`(${query.getQuery()})`, '_p')
      .setParameters(query.getParameters())
      .limit(pageSize)
      .offset(offset);

    substitutionQuery = this.offersQuerySortHelper.applyFlatSort(substitutionQuery, sort);

    const substitution = await substitutionQuery.getRawMany();
    //const source = await query.getMany();
    const itemsCount = await query.getCount();

    const source = substitution.reduce(convertorFlatToObject(), []);

    const bids = await this.getBids(this.getAuctionIds(source));

    const searchIndex = await this.getSearchIndex(this.sqlCollectionIdTokenId(source));

    return {
      page,
      pageSize,
      itemsCount,
      items: this.parseOffers(source, bids, searchIndex),
    };
  }

  private parseOffers(source: any, bids: Partial<Bid>[], searchIndex: Partial<SearchIndex>[]): ContractAsk[] {
    return source.reduce((acc, item) => {
      if (item.auction !== null) {
        item.auction.bids = bids.filter((bid) => bid.auctionId === item.auction.id) as any as BidEntity[];
      }
      item['tokenDescription'] = searchIndex
        .filter((index) => index.collection_id === item.collection_id && index.token_id === item.token_id)
        .reduce(this.parseSearchIndex(), {
          attributes: [],
        });

      acc.push(item);
      return acc;
    }, []);
  }

  async getOne(filter: { collectionId: number; tokenId: number }): Promise<OfferContractAskDto | null> {
    const { collectionId, tokenId } = filter;

    const queryBuilder = this.connection.manager
      .createQueryBuilder(ContractAsk, 'offer')
      .where('offer.collection_id = :collectionId', { collectionId })
      .andWhere('offer.token_id = :tokenId', { tokenId })
      .andWhere('offer.status in (:...status)', { status: ['active', 'removed_by_admin'] });

    this.addRelations(queryBuilder);

    const source = await queryBuilder.getMany();
    const bids = await this.getBids(this.getAuctionIds(source));

    const searchIndex = await this.getSearchIndex(this.sqlCollectionIdTokenId(source));

    const contractAsk = this.parseOffers(source, bids, searchIndex).pop();

    return contractAsk && OfferContractAskDto.fromContractAsk(contractAsk);
  }

  private addRelations(queryBuilder: SelectQueryBuilder<ContractAsk>): void {
    queryBuilder
      .leftJoinAndMapOne('offer.auction', AuctionEntity, 'auction', 'auction.contract_ask_id = offer.id')
      .leftJoinAndMapOne(
        'offer.block',
        BlockchainBlock,
        'block',
        'offer.network = block.network and block.block_number = offer.block_number_ask',
      )
      .leftJoinAndSelect(
        (subQuery) => {
          return subQuery
            .select([
              'collection_id',
              'network',
              'token_id',
              'is_trait',
              'locale',
              'array_length(items, 1) as count_items',
              'items',
              'unnest(items) traits',
              'key',
            ])
            .from(SearchIndex, 'sf')
            .where(`sf.type not in ('ImageURL')`);
        },
        'search_filter',
        'offer.network = search_filter.network and offer.collection_id = search_filter.collection_id and offer.token_id = search_filter.token_id',
      )
      .leftJoinAndSelect(
        (subQuery) => {
          return subQuery.select(['auction_id as auc_id', 'bidder_address']).from(BidEntity, '_bids').where('_bids.amount > 0');
        },
        '_bids',
        '_bids.auc_id = auction.id',
      );
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
