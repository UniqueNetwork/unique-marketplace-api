import { BadRequestException, HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { InjectSentry, SentryService } from '../utils/sentry';
import { Connection, SelectQueryBuilder } from 'typeorm';
import { OffersService } from './offers.service';
import { ContractAsk, OfferFilters } from '../entity';
import { OfferAttributes } from './dto/offer-attributes';
import { OffersFilter, OfferTraits, TraitDto } from './dto';
import { PaginationRequest } from '../utils/pagination/pagination-request';
import { OfferSortingRequest } from '../utils/sorting/sorting-request';
import { OffersQuerySortHelper } from './offers-query-sort-helper';
import { priceTransformer } from '../utils/price-transformer';
import { nullOrWhitespace } from '../utils/string/null-or-white-space';

@Injectable()
export class OffersFilterService {
  private logger: Logger;
  private readonly offersQuerySortHelper: OffersQuerySortHelper;

  constructor(
    @Inject('DATABASE_CONNECTION') private connection: Connection,
    @InjectSentry() private readonly sentryService: SentryService,
  ) {
    this.logger = new Logger(OffersService.name);
    this.offersQuerySortHelper = new OffersQuerySortHelper(connection);
  }

  public addSearchIndex(queryBuilder: SelectQueryBuilder<ContractAsk>): SelectQueryBuilder<ContractAsk> {
    return queryBuilder;
  }

  /**
   *  Get the attributes for the given collection
   * @param collectionId
   * @returns
   */
  public async attributes(collectionId: number): Promise<OfferTraits | null> {
    let attributes = [];
    try {
      attributes = (await this.connection.manager
        .createQueryBuilder()
        .select(['key', 'traits as trait ', 'count(traits) over (partition by traits, key) as count'])
        .distinct()
        .from(OfferFilters, 'v_offers_search')
        .where('collection_id = :collectionId', { collectionId })
        .andWhere('traits is not null')
        .andWhere('locale is not null')
        .getRawMany()) as Array<TraitDto>;
    } catch (error) {
      this.logger.error(error.message);
      throw new BadRequestException({
        status: HttpStatus.BAD_REQUEST,
        message: 'Error while fetching attributes',
        error: error.message,
      });
    }

    return {
      collectionId,
      attributes: this.parseAttributes(attributes),
    };
  }
  private parseAttributes(attributes: any[]): TraitDto[] {
    return attributes.reduce((previous, current) => {
      const tempObj = {
        key: current['trait'],
        count: +current['count'],
      };

      if (!previous[current['key']]) {
        previous[current['key']] = [];
      }

      previous[current['key']].push(tempObj);
      return previous;
    }, {});
  }

  /**
   * Get the attributes with count for the given collection
   * @param collectionIds
   * @returns
   */
  public async attributesCount(collectionIds: number[]): Promise<Array<OfferAttributes>> {
    try {
      const counts = (await this.connection.manager
        .createQueryBuilder()
        .select(['total_items as "numberOfAttributes"', 'count(offer_id) over (partition by total_items) as amount'])
        .distinct()
        .from((qb) => {
          return qb
            .select(['total_items', 'offer_id'])
            .distinct()
            .from(OfferFilters, 'v_offers_search')
            .where('collection_id in (:...collectionIds)', { collectionIds })
            .andWhere('total_items is not null');
        }, '_offers')
        .getRawMany()) as Array<OfferAttributes>;

      return counts.map((item) => {
        return {
          numberOfAttributes: +item.numberOfAttributes,
          amount: +item.amount,
        };
      });
    } catch (e) {
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: `Could not find any attributes for collection ${collectionIds.join(',')}`,
        error: e.message,
      });
    }
  }
  /**
   * Filter by collection id
   * @param query {SelectQueryBuilder<OfferFilters>} The query to filter
   * @param collectionIds {number[]} The collection ids to filter
   * @private
   * @returns {SelectQueryBuilder<OfferFilters>}
   */
  private byCollectionId(query: SelectQueryBuilder<OfferFilters>, collectionIds?: number[]): SelectQueryBuilder<OfferFilters> {
    if ((collectionIds ?? []).length <= 0) {
      return query;
    }
    return query.andWhere('v_offers_search.collection_id in (:...collectionIds)', { collectionIds });
  }

  private byMaxPrice(query: SelectQueryBuilder<OfferFilters>, maxPrice?: bigint): SelectQueryBuilder<OfferFilters> {
    if (!maxPrice) {
      return query;
    }
    return query.andWhere('v_offers_search.offer_price <= :maxPrice', {
      maxPrice: priceTransformer.to(maxPrice),
    });
  }

  private byMinPrice(query: SelectQueryBuilder<OfferFilters>, minPrice?: bigint): SelectQueryBuilder<OfferFilters> {
    if (!minPrice) {
      return query;
    }
    return query.andWhere('v_offers_search.offer_price >= :minPrice', {
      minPrice: priceTransformer.to(minPrice),
    });
  }

  private bySeller(query: SelectQueryBuilder<OfferFilters>, seller?: string): SelectQueryBuilder<OfferFilters> {
    if (nullOrWhitespace(seller)) {
      query.andWhere('v_offers_search.offer_status = :status', { status: 'active' });
      return query;
    }
    return query
      .andWhere('v_offers_search.offer_address_from = :seller', { seller })
      .andWhere('v_offers_search.offer_status in (:...offer_status)', { offer_status: ['active', 'removed_by_admin'] });
  }

  private byLocale(query: SelectQueryBuilder<OfferFilters>, locale?: string): SelectQueryBuilder<OfferFilters> {
    if (nullOrWhitespace(locale)) {
      return query;
    }
    return query.andWhere('v_offers_search.locale = :locale', { locale });
  }

  private byTrait(query: SelectQueryBuilder<OfferFilters>, trait?: string): SelectQueryBuilder<OfferFilters> {
    if (nullOrWhitespace(trait)) {
      return query;
    }
    return query.andWhere(`v_offers_search.traits ilike concat('%', cast(:trait as text), '%')`, { trait });
  }

  private byNumberOfAttributes(query: SelectQueryBuilder<OfferFilters>, numberOfAttributes?: number[]): SelectQueryBuilder<OfferFilters> {
    if ((numberOfAttributes ?? []).length <= 0) {
      return query;
    }
    return query.andWhere('v_offers_search.total_items in (:...numberOfAttributes)', { numberOfAttributes });
  }

  private byFindAttributes(
    query: SelectQueryBuilder<OfferFilters>,
    collectionIds?: number[],
    attributes?: string[],
  ): SelectQueryBuilder<OfferFilters> {
    if ((attributes ?? []).length <= 0) {
      return query;
    } else {
      if ((collectionIds ?? []).length <= 0) {
        throw new BadRequestException({
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'You must provide a collection id to filter by traits',
        });
      } else {
        query
          .andWhere('v_offers_search.collection_id in (:...collectionIds)', { collectionIds })
          .andWhere('array [:...traits] <@ v_offers_search.list_items', { traits: attributes });
      }
    }
    return query;
  }

  private byBidder(query: SelectQueryBuilder<OfferFilters>, bidder?: string): SelectQueryBuilder<OfferFilters> {
    if (nullOrWhitespace(bidder)) {
      return query;
    }
    return query.andWhere('v_offers_search.auction_bidder_address = :bidder', { bidder });
  }

  private byAuction(
    query: SelectQueryBuilder<OfferFilters>,
    bidder?: string,
    isAuction?: boolean | string,
  ): SelectQueryBuilder<OfferFilters> {
    if (isAuction !== null) {
      const _auction = isAuction === true || isAuction === 'true';
      if (_auction) {
        query.andWhere('v_offers_search.auction_id is not null');
      } else {
        query.andWhere('v_offers_search.auction_id is null');
      }
    }

    query = this.byBidder(query, bidder);

    return query;
  }

  private bySearch(
    query: SelectQueryBuilder<OfferFilters>,
    search?: string,
    locale?: string,
    numberOfAttributes?: number[],
  ): SelectQueryBuilder<OfferFilters> {
    query = this.byNumberOfAttributes(query, numberOfAttributes);
    query = this.byTrait(query, search);
    query = this.byLocale(query, locale);
    return query;
  }
  /**
   *
   * @param query
   * @returns
   */
  private pagination(
    query: SelectQueryBuilder<OfferFilters>,
    pagination: PaginationRequest,
  ): { query: SelectQueryBuilder<OfferFilters>; page: number; pageSize: number } {
    const page = pagination.page ?? 1;
    const pageSize = pagination.pageSize ?? 10;
    const offset = (page - 1) * pageSize;

    const queryLimit = query.limit(pageSize).offset(offset);

    return {
      query: queryLimit,
      page,
      pageSize,
    };
  }

  private prepareQuery(query: SelectQueryBuilder<OfferFilters>): SelectQueryBuilder<any> {
    return this.connection
      .createQueryBuilder()
      .select([
        'v_offers_search_offer_id as offer_id',
        'v_offers_search_offer_status as offer_status',
        'v_offers_search_collection_id as collection_id',
        'v_offers_search_token_id as token_id',
        'v_offers_search_offer_network as offer_network',
        'v_offers_search_offer_price as offer_price',
        'v_offers_search_offer_currency as offer_currency',
        'v_offers_search_offer_address_from as offer_address_from',
        'v_offers_search_offer_address_to as offer_address_to',
        'v_offers_search_offer_block_number_ask as offer_block_number_ask',
        'v_offers_search_offer_block_number_cancel as offer_block_number_cancel',
        'v_offers_search_offer_block_number_buy as offer_block_number_buy',
        'v_offers_search_auction_id as auction_id',
        'v_offers_search_auction_created_at as auction_created_at',
        'v_offers_search_auction_updated_at as auction_updated_at',
        'v_offers_search_auction_price_step as auction_price_step',
        'v_offers_search_auction_start_price as auction_start_price',
        'v_offers_search_auction_status as auction_status',
        'v_offers_search_auction_stop_at as auction_stop_at',
        'v_offers_search_offer_created_at_ask as offer_created_at_ask',
      ])
      .distinct()
      .from(`(${query.getQuery()})`, '_filter')
      .setParameters(query.getParameters());
  }

  private async countQuery(query: SelectQueryBuilder<OfferFilters>): Promise<number> {
    const countQuery = this.connection
      .createQueryBuilder()
      .select('count(offer_id) as count')
      .from(`(${query.getQuery()})`, '_count')
      .setParameters(query.getParameters());

    const count = await countQuery.getRawOne();
    return +count?.count || 0;
  }

  private sortBy(query: SelectQueryBuilder<OfferFilters>, sortBy: OfferSortingRequest): SelectQueryBuilder<OfferFilters> {
    query = this.offersQuerySortHelper.applyFlatSort(query, sortBy);
    return query;
  }

  private byAttributes(query: SelectQueryBuilder<OfferFilters>): SelectQueryBuilder<any> {
    const attributes = this.connection.manager
      .createQueryBuilder()
      .select(['key', 'traits as trait ', 'count(traits) over (partition by traits, key) as count'])
      .distinct()
      .from((qb) => {
        return qb
          .select(['v_offers_search_key as key', 'v_offers_search_traits as traits'])
          .from(`(${query.getQuery()})`, '_filter')
          .setParameters(query.getParameters())
          .where('v_offers_search_traits is not null')
          .andWhere('v_offers_search_locale is not null');
      }, '_filter');
    return attributes;
  }

  private async byAttributesCount(query: SelectQueryBuilder<OfferFilters>): Promise<Array<OfferAttributes>> {
    const attributesCount = (await this.connection.manager
      .createQueryBuilder()
      .select(['total_items as "numberOfAttributes"', 'count(offer_id) over (partition by total_items) as amount'])
      .distinct()
      .from((qb) => {
        return qb
          .select(['v_offers_search_total_items as total_items', 'v_offers_search_offer_id as offer_id'])
          .from(`(${query.getQuery()})`, '_filter')
          .distinct()
          .setParameters(query.getParameters())
          .where('v_offers_search_total_items is not null');
      }, '_filter')
      .getRawMany()) as Array<OfferAttributes>;

    return attributesCount.map((item) => {
      return {
        numberOfAttributes: +item.numberOfAttributes,
        amount: +item.amount,
      };
    });
  }

  private byCollectionTokenId(query: SelectQueryBuilder<OfferFilters>, collectionId: number, tokenId: number): SelectQueryBuilder<any> {
    return query
      .andWhere('v_offers_search.collection_id = :collectionId', { collectionId })
      .andWhere('v_offers_search.token_id = :tokenId', { tokenId })
      .andWhere('v_offers_search.offer_status in (:...status)', { status: ['active', 'removed_by_admin'] });
  }

  public async filterByOne(collectionId: number, tokenId: number): Promise<any> {
    let queryFilter = this.connection.manager.createQueryBuilder(OfferFilters, 'v_offers_search');
    queryFilter = this.byCollectionTokenId(queryFilter, collectionId, tokenId);
    queryFilter = this.prepareQuery(queryFilter);
    const itemQuery = await this.pagination(queryFilter, { page: 1, pageSize: 1 });
    const items = await itemQuery.query.getRawMany();
    return items;
  }

  public async filter(offersFilter: OffersFilter, pagination: PaginationRequest, sort: OfferSortingRequest): Promise<any> {
    let queryFilter = this.connection.manager.createQueryBuilder(OfferFilters, 'v_offers_search');
    // Filert by collection id
    queryFilter = this.byCollectionId(queryFilter, offersFilter.collectionId);
    // Filter by max price
    queryFilter = this.byMaxPrice(queryFilter, offersFilter.maxPrice);
    // Filter by min price
    queryFilter = this.byMinPrice(queryFilter, offersFilter.minPrice);
    // Filter by seller address
    queryFilter = this.bySeller(queryFilter, offersFilter.seller);
    // Filter by search
    queryFilter = this.bySearch(queryFilter, offersFilter.searchText, offersFilter.searchLocale, offersFilter.numberOfAttributes);
    // Filter by auction
    queryFilter = this.byAuction(queryFilter, offersFilter.bidderAddress, offersFilter.isAuction);
    // Filter by traits
    queryFilter = this.byFindAttributes(queryFilter, offersFilter.collectionId, offersFilter.attributes);

    const attributes = await this.byAttributes(queryFilter).getRawMany();
    const attributesCount = await this.byAttributesCount(queryFilter);

    queryFilter = this.prepareQuery(queryFilter);

    const itemsCount = await this.countQuery(queryFilter);

    queryFilter = this.sortBy(queryFilter, sort);

    const itemQuery = this.pagination(queryFilter, pagination);

    const items = await itemQuery.query.getRawMany();

    return {
      items,
      itemsCount,
      page: itemQuery.page,
      pageSize: itemQuery.pageSize,
      attributes: this.parseAttributes(attributes),
      attributesCount,
    };
  }
}
