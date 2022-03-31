import { OfferTraits } from './dto/offer-traits';
import { BadRequestException, HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { Connection, Repository, SelectQueryBuilder } from 'typeorm';

import { paginate } from '../utils/pagination/paginate';
import { PaginationRequest } from '../utils/pagination/pagination-request';
import { PaginationResultDto } from '../utils/pagination/pagination-result';
import { OfferSortingRequest } from '../utils/sorting/sorting-request';
import { nullOrWhitespace } from '../utils/string/null-or-white-space';

import { OfferContractAskDto } from './dto/offer-dto';
import { OffersFilter } from './dto/offers-filter';
import { priceTransformer } from '../utils/price-transformer';
import {
  BlockchainBlock,
  ContractAsk,
  SearchIndex,
  AuctionEntity,
  BidEntity,
} from '../entity';
import { InjectSentry, SentryService } from '../utils/sentry';
import { OffersQuerySortHelper } from "./offers-query-sort-helper";

@Injectable()
export class OffersService {
  private logger: Logger;
  private readonly contractAskRepository: Repository<ContractAsk>;
  private readonly searchIndexRepository: Repository<SearchIndex>;
  private offersQuerySortHelper: OffersQuerySortHelper;

  constructor(
    @Inject('DATABASE_CONNECTION') private connection: Connection,
    @InjectSentry() private readonly sentryService: SentryService,
  ) {
    this.logger = new Logger(OffersService.name);
    this.contractAskRepository = connection.manager.getRepository(ContractAsk);
    this.searchIndexRepository = connection.manager.getRepository(SearchIndex);
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
    let offers: SelectQueryBuilder<ContractAsk>;
    let paginationResult;

    try {
      offers = await this.contractAskRepository.createQueryBuilder('offer')
      this.addRelations(offers);

      offers = this.filter(offers, offersFilter);
      offers = this.offersQuerySortHelper.applySort(offers, sort);
      paginationResult = await paginate(offers, pagination);
      /*if ((offersFilter.traitsCount ?? []).length !== 0 ) {
        const filterItems = paginationResult.items.filter((item) => (offersFilter?.traitsCount.includes(item.search_index.length)));
        paginationResult.items = filterItems;
        paginationResult.itemsCount = filterItems.length;
      }*/
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
      ...paginationResult,
      items: paginationResult.items.map(OfferContractAskDto.fromContractAsk),
    })
  }

  async getOne(filter: { collectionId: number, tokenId: number }): Promise<OfferContractAskDto | null> {
    const { collectionId, tokenId } = filter;

    const queryBuilder = this.connection.manager
      .createQueryBuilder(ContractAsk, 'offer')
      .where('offer.collection_id = :collectionId', { collectionId })
      .andWhere('offer.token_id = :tokenId', { tokenId })
      .andWhere('offer.status = :status', { status: 'active' });

    this.addRelations(queryBuilder);

    const contractAsk = await queryBuilder.getOne();

    return contractAsk && OfferContractAskDto.fromContractAsk(contractAsk)
  }


  private addRelations(
      queryBuilder: SelectQueryBuilder<ContractAsk>
    ): void {
    queryBuilder
      .leftJoinAndMapOne(
        'offer.auction',
        AuctionEntity,
        'auction',
        'auction.contract_ask_id = offer.id'
      )
      .leftJoinAndMapMany(
        'auction.bids',
        BidEntity,
        'bid',
        'bid.auction_id = auction.id and bid.amount > 0')
      .leftJoinAndMapOne(
        'offer.block',
        BlockchainBlock,
        'block',
        'offer.network = block.network and block.block_number = offer.block_number_ask',
      )
      .leftJoinAndMapMany(
        'offer.search_index',
        SearchIndex,
        'search_index',
        'offer.network = search_index.network and offer.collection_id = search_index.collection_id and offer.token_id = search_index.token_id'
      )
      .leftJoinAndMapMany(
        'offer.search_filter',
        (subQuery => {
            return subQuery.select([
              'collection_id',
              'network',
              'token_id',
              'is_trait',
              'locale',
              'array_length(items, 1) as count_items',
              'items',
              'unnest(items) traits'
            ])
            .from(SearchIndex, 'sf')
            .where(`sf.type not in ('ImageURL')`)
        }),
        'search_filter',
        'offer.network = search_filter.network and offer.collection_id = search_filter.collection_id and offer.token_id = search_filter.token_id'
      )
  }

  /**
   * Filter by Collection ID
   * @param {SelectQueryBuilder<ContractAsk>} query - Selecting data from the ContractAsk table
   * @param {Array<number>} collectionIds - Array collection ID
   * @private
   * @see OffersService.get
   * @return {SelectQueryBuilder<ContractAsk>}
   */
  private filterByCollectionId(query: SelectQueryBuilder<ContractAsk>, collectionIds?: number[]): SelectQueryBuilder<ContractAsk> {
    if ((collectionIds ?? []).length <= 0) {
      return query;
    }

    return query.andWhere('offer.collection_id in (:...collectionIds)', { collectionIds });
  }

  /**
   * Filter by Max Price
   * @param {SelectQueryBuilder<ContractAsk>} query - Selecting data from the ContractAsk table
   * @param {BigInt} maxPrice - Int max price
   * @private
   * @see OffersService.get
   * @return {SelectQueryBuilder<ContractAsk>}
   */
  private filterByMaxPrice(query: SelectQueryBuilder<ContractAsk>, maxPrice?: BigInt): SelectQueryBuilder<ContractAsk> {
    if (maxPrice == null) {
      return query;
    }
    return query.andWhere('offer.price <= :maxPrice', { maxPrice: priceTransformer.to(maxPrice) });
    // return query.andWhere('offer.price <= :maxPrice', { maxPrice: maxPrice });
  }

  /**
   * Filter by Min Price
   * @param {SelectQueryBuilder<ContractAsk>} query - Selecting data from the ContractAsk table
   * @param {BigInt} minPrice - Int mix price
   * @private
   * @see OffersService.get
   * @return {SelectQueryBuilder<ContractAsk>}
   */
  private filterByMinPrice(query: SelectQueryBuilder<ContractAsk>, minPrice?: BigInt): SelectQueryBuilder<ContractAsk> {
    if (minPrice == null) {
      return query;
    }

    return query.andWhere('offer.price >= :minPrice', { minPrice: priceTransformer.to(minPrice) });
  }

  /**
   * Filter by Min Price
   * @description  Fetches from SearchIndex by searchText based on collection id and token id
   * @param {SelectQueryBuilder<ContractAsk>} query - Selecting data from the ContractAsk table
   * @param {String} text - Search field from SearchIndex in which traits are specified
   * @param {String} locale -
   * @param {number[]} traitsCount -
   * @private
   * @see OffersService.get
   * @return SelectQueryBuilder<ContractAsk>
   */
  private filterBySearchText(query: SelectQueryBuilder<ContractAsk>, text?: string, locale?: string, traitsCount?: number[]): SelectQueryBuilder<ContractAsk> {

    //if(nullOrWhitespace(text) || nullOrWhitespace(locale) || (traitsCount ?? []).length === 0) return query;

    if ((traitsCount ?? []).length !== 0) {
      query.andWhere(`search_index.is_trait = true`);
    }

    if(!nullOrWhitespace(text)) {
      query.andWhere(`search_filter.traits ILIKE CONCAT('%', cast(:searchText as text), '%')`, { searchText: text })
    }

    if(!nullOrWhitespace(locale)) {
      query.andWhere('(search_index.locale is null OR search_index.locale = :locale)', { locale: locale, })
    }

    return query
  }

  /**
   * Filter by Seller
   * @description  Generates a data request where address_from == seller
   * @param {SelectQueryBuilder<ContractAsk>} query - Selecting data from the ContractAsk table
   * @param {String} seller - Seller Hash
   * @private
   * @see OffersService.get
   * @return SelectQueryBuilder<ContractAsk>
   */
  private filterBySeller(query: SelectQueryBuilder<ContractAsk>, seller?: string): SelectQueryBuilder<ContractAsk> {
    if (nullOrWhitespace(seller)) {
      return query;
    }

    return query.andWhere('offer.address_from = :seller', { seller });
  }
/**
 * Filter by Auction
 * @param {SelectQueryBuilder<ContractAsk>} query - Selecting data from the ContractAsk table
 * @param {String} bidderAddress - bidder address for bids in auction
 * @param {Boolean} isAuction - flag for checking auctions in offers
 * @private
 * @see OffersService.get
 * @return SelectQueryBuilder<ContractAsk>
 */
  private filterByAuction(query: SelectQueryBuilder<ContractAsk>, bidderAddress?: string, isAuction?: boolean | string): SelectQueryBuilder<ContractAsk> {

    if (isAuction !== null) {
      const _auction = (isAuction === 'true');
      if (_auction === true) {
        query.andWhere('auction.id is not null');
      } else {
        query.andWhere('auction.id is null');
      }
    }


    if(!nullOrWhitespace(bidderAddress)) {
      query.andWhere('(bid.bidder_address = :bidderAddress)', { bidderAddress });
    }

    return query;
  }
  /**
   * Filter by Traits
   * @param {SelectQueryBuilder<ContractAsk>} query - Selecting data from the ContractAsk table
   * @param {Array<number>} collectionIds - Array collection ID
   * @param {Array<string>} traits - Array traits for token
   * @private
   * @see OffersService.get
   * @return SelectQueryBuilder<ContractAsk>
   */
  private filterByTraits(query: SelectQueryBuilder<ContractAsk>, collectionIds?: number[], traits?: string[]): SelectQueryBuilder<ContractAsk> {

    if ((traits ?? []).length <= 0) {
      return query
    } else {
      if ((collectionIds ?? []).length <= 0) {
          throw new BadRequestException({
            statusCode: HttpStatus.BAD_REQUEST,
            message: 'Not found collectionIds. Please set collectionIds to offer by filter',
          });
      } else {
        traits.forEach(trait => {
          query.andWhere('search_index.value = :trait', { trait });
        });
        return query
      }
    }
  }

  /**
   * Filter all create OffersFilter Dto
   * @param {SelectQueryBuilder<ContractAsk>} query - Selecting data from the ContractAsk table
   * @param {OffersFilter} offersFilter - All filters combined into one create OffersFilter Dto
   * @private
   * @see OffersService.get
   * @return SelectQueryBuilder<ContractAsk>
   */
  private filter(query: SelectQueryBuilder<ContractAsk>, offersFilter: OffersFilter): SelectQueryBuilder<ContractAsk> {
    query = this.filterByCollectionId(query, offersFilter.collectionId);
    query = this.filterByMaxPrice(query, offersFilter.maxPrice);
    query = this.filterByMinPrice(query, offersFilter.minPrice);
    query = this.filterBySeller(query, offersFilter.seller);
    query = this.filterBySearchText(query, offersFilter.searchText, offersFilter.searchLocale, offersFilter.traitsCount);
    query = this.filterByAuction(query, offersFilter.bidderAddress, offersFilter.isAuction);
    query = this.filterByTraits(query, offersFilter.collectionId, offersFilter.traits);

    return query.andWhere(`offer.status = :status`, { status: 'active' });
  }

  public get isConnected(): boolean {
    return true;
  }

  async getTraits( collectionId: number ): Promise<OfferTraits | null> {
    let traits = [];
    try {
      traits =  await this.connection.manager.query(`
      select trait, count(trait) from (
        select traits as trait, collection_id, token_id from search_index, unnest(items) traits
        where locale is not null and collection_id = $1
    ) as si
    left join contract_ask ca on ca.collection_id = si.collection_id and ca.token_id = si.token_id
    where ca.status = 'active'
    group by trait`, [collectionId]);

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

    return {
      collectionId,
      traits
    };
  }
}
