import { TradesFilter } from './dto/trade-filter';
import { BadRequestException, HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { Connection, SelectQueryBuilder } from 'typeorm';

import { nullOrWhitespace } from '../utils/string/null-or-white-space';
import { PaginationRequest } from '../utils/pagination/pagination-request';
import { PaginationResult } from '../utils/pagination/pagination-result';
import { equalsIgnoreCase } from '../utils/string/equals-ignore-case';
import { SortingOrder } from '../utils/sorting/sorting-order';
import { TradeSortingRequest } from '../utils/sorting/sorting-request';
import { paginate } from '../utils/pagination/paginate';
import { MarketTradeDto } from './dto/trade-dto';
import { MarketTrade, SearchIndex } from '../entity';
import { IMarketTrade } from './interfaces/trade.interface';
import { InjectSentry, SentryService } from '../utils/sentry';

@Injectable()
export class TradesService {
  private offerSortingColumns = ['Price', 'TokenId', 'CollectionId'];
  private sortingColumns = [...this.offerSortingColumns, 'TradeDate'];
  private logger: Logger;

  constructor(
    @Inject('DATABASE_CONNECTION') private connection: Connection,
    @InjectSentry() private readonly sentryService: SentryService,
  ) {
    this.logger = new Logger(TradesService.name);
  }

  /**
   * Retrieving trade data
   *
   * @param {Array<number>} collectionIds - collection ID
   * @param {String} seller - Seller Hash
   * @param {PaginationRequest} paginationRequest  - { page: 1 , pageSize: 10}
   * @param {TradeSortingRequest} sort - Possible values: asc(Price), desc(Price), asc(TokenId), desc(TokenId), asc(CollectionId), desc(CollectionId), asc(TradeDate), desc(TradeDate).
   * @see TradesController.get
   * @return ({Promise<PaginationResult<MarketTradeDto>>})
   */
  async get(
    tradesFilter: TradesFilter,
    accountId: string | undefined,
    paginationRequest: PaginationRequest,
    sort: TradeSortingRequest,
  ): Promise<PaginationResult<MarketTradeDto>> {
    let tradesQuery: SelectQueryBuilder<IMarketTrade>;
    let paginationResult;
    try {
      tradesQuery = this.connection.manager.createQueryBuilder(MarketTrade, 'trade');
      this.addRelations(tradesQuery);

      tradesQuery = this.filterByCollectionIds(tradesQuery, tradesFilter.collectionId);
      tradesQuery = this.filterByTokenIds(tradesQuery, tradesFilter.tokenId);
      tradesQuery = this.filterByAccountId(tradesQuery, accountId);
      tradesQuery = this.applySort(tradesQuery, sort);

      this.logger.log(tradesQuery.getQueryAndParameters());

      paginationResult = await paginate(tradesQuery, paginationRequest);
    } catch (e) {
      this.logger.error(e);
      this.sentryService.instance().captureException(new BadRequestException(e), {
        tags: { section: 'market_trade' },
      });
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        message:
          'Something went wrong! Perhaps there is no table [market_trade] in the database, the sequence of installation and configuration or failure to sort or filter data.',
        error: e.message,
      });
    }

    try {
    } catch (e) {
      this.logger.error(e.message);
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Something went wrong! Failure to sort or filter data.',
        error: e.message,
      });
    }

    return {
      ...paginationResult,
      items: paginationResult.items.map((t) => this.serializeTradeToDto(t)),
    };
  }

  /**
   * Conversion of data from MarketTrade to JSON
   * @example: items: MarketTradeDto[]
   * @param {MarketTrade} trade - entity MarketTrade model
   * @private
   * @see TradesService.get
   * @return ({MarketTradeDto})
   */
  private serializeTradeToDto(trade: IMarketTrade): MarketTradeDto {
    return {
      buyer: trade.address_buyer,
      seller: trade.address_seller,
      collectionId: +trade.collection_id,
      creationDate: trade.ask_created_at,
      price: trade.price,
      quoteId: +trade.currency,
      tokenId: +trade.token_id,
      tradeDate: trade.buy_created_at,
    };
  }

  /**
   * Sort fields in ascending and descending order
   * @param {SelectQueryBuilder<IMarketTrade>} query - Selecting data from the MarketTrade table
   * @param {TradeSortingRequest} sort - Possible values: asc(Price), desc(Price), asc(TokenId), desc(TokenId) and more
   * @see TradesService.get
   * @private
   * @return ({SelectQueryBuilder<IMarketTrade>})
   */
  private applySort(query: SelectQueryBuilder<IMarketTrade>, sort: TradeSortingRequest): SelectQueryBuilder<IMarketTrade> {
    let params = [];

    if (JSON.stringify(sort.sort).includes('TradeDate') === false) sort.sort.push({ order: 1, column: 'TradeDate' });

    for (let param of sort.sort ?? []) {
      let column = this.sortingColumns.find((column) => equalsIgnoreCase(param.column, column));

      if (column === 'tokenid' || column === 'TokenId') {
        column = 'token_id';
      }
      if (column === 'tradedate' || column === 'TradeDate') {
        column = 'buy_created_at';
      }
      if (column === 'collectionid' || column === 'CollectionId') {
        column = 'collection_id';
      }

      if (column === null || column === undefined) continue;
      params.push({ ...param, column });
    }

    if (params.length <= 0) {
      return query;
    }

    let first = true;
    for (let param of params) {
      let table = this.offerSortingColumns.indexOf(param.column) > -1 ? 'trade' : 'trade';
      query = query[first ? 'orderBy' : 'addOrderBy'](`${table}.${param.column}`, param.order === SortingOrder.Asc ? 'ASC' : 'DESC');
      first = false;
    }

    return query;
  }

  /**
   * Sorting by collections
   * @param {SelectQueryBuilder<IMarketTrade>} query - Selecting data from the MarketTrade table
   * @param {Array<number>} collectionIds -  collection ID (Array)
   * @private
   * @see TradesService.get
   * @return ({SelectQueryBuilder<IMarketTrade>})
   */
  private filterByCollectionIds(
    query: SelectQueryBuilder<IMarketTrade>,
    collectionIds: number[] | undefined,
  ): SelectQueryBuilder<IMarketTrade> {
    if (collectionIds == null || collectionIds.length <= 0) {
      return query;
    }

    return query.andWhere('trade.collection_id in (:...collectionIds)', { collectionIds });
  }

  /**
   * Sorting by Seller
   * @param {SelectQueryBuilder<IMarketTrade>} query - Selecting data from the MarketTrade table
   * @param {String } seller - Seller Hash
   * @private
   * @see TradesService.get
   * @return ({SelectQueryBuilder<IMarketTrade>})
   */
  private filterByAccountId(query: SelectQueryBuilder<IMarketTrade>, accountId: string | undefined): SelectQueryBuilder<IMarketTrade> {
    if (nullOrWhitespace(accountId)) {
      return query;
    }
    return query.andWhere('(trade.address_seller = :accountId OR trade.address_buyer = :accountId)', { accountId: accountId });
  }
  public get isConnected(): boolean {
    return true;
  }

  private filterByTokenIds(
    query: SelectQueryBuilder<IMarketTrade>,
    tokenIds: number[] | undefined,
  ): SelectQueryBuilder<IMarketTrade> {
    if (tokenIds === null || tokenIds.length <= 0) {
      return query;
    }
    return query.andWhere('trade.token_id in (:...tokenIds)', { tokenIds });
  }

  private addRelations(
    queryBuilder: SelectQueryBuilder<IMarketTrade>
  ): void {
    queryBuilder
    .leftJoinAndMapMany(
      'trade.search_index',
      SearchIndex,
      'search_index',
      'trade.network = search_index.network and trade.collection_id = search_index.collection_id and trade.token_id = search_index.token_id'
    )
    .leftJoinAndMapMany(
      'trade.search_filter',
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
      'trade.network = search_filter.network and trade.collection_id = search_filter.collection_id and trade.token_id = search_filter.token_id'
    )
  }

  private filterBySearchText(query: SelectQueryBuilder<IMarketTrade>, text?: string): SelectQueryBuilder<IMarketTrade> {
    return query;
  }
}
