import { Inject, Injectable } from '@nestjs/common';
import { Connection, SelectQueryBuilder } from 'typeorm';

import { Trade } from '../entity';

import { nullOrWhitespace } from '../utils/string/null-or-white-space';
import { PaginationRequest } from '../utils/pagination/pagination-request';
import { PaginationResult } from '../utils/pagination/pagination-result';
import { equalsIgnoreCase } from '../utils/string/equals-ignore-case';
import { SortingOrder } from '../utils/sorting/sorting-order';
import { TradeSortingRequest } from '../utils/sorting/sorting-request';
import { paginate } from '../utils/pagination/paginate';
import { MarketTradeDto, TradeDto } from './dto/trade-dto';
import { MarketTrade } from '../entity/evm';
import { IMarketTrade } from './interfaces/trade.interface';

@Injectable()
export class TradesService {
    private offerSortingColumns = ['Price', 'TokenId', 'CollectionId'];
    private sortingColumns = [...this.offerSortingColumns, 'TradeDate'];

    constructor(@Inject('DATABASE_CONNECTION') private connection: Connection) {}

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
        collectionIds: number[] | undefined,
        seller: string | undefined,
        paginationRequest: PaginationRequest,
        sort: TradeSortingRequest,
    ): Promise<PaginationResult<MarketTradeDto>> {
        let tradesQuery = this.connection.manager.createQueryBuilder(MarketTrade, 'trade');

        tradesQuery = this.filterByCollectionIds(tradesQuery, collectionIds);
        tradesQuery = this.filterBySeller(tradesQuery, seller);
        tradesQuery = this.applySort(tradesQuery, sort);

        const paginationResult = await paginate(tradesQuery, paginationRequest);

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

        for (let param of sort.sort ?? []) {
            let column = this.sortingColumns.find((column) => equalsIgnoreCase(param.column, column)).toLowerCase();
            if (column === 'tokenid' || column === 'TokenId') {
                column = 'token_id';
            }
            if (column === 'tradedate' || column === 'TradeDate') {
                column = 'buy_created_at';
            }
            if (column === 'collectionid' || column === 'CollectionId') {
                column = 'collection_id';
            }
            if (column === null) continue;
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
    private filterByCollectionIds(query: SelectQueryBuilder<IMarketTrade>, collectionIds: number[] | undefined): SelectQueryBuilder<IMarketTrade> {
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
    private filterBySeller(query: SelectQueryBuilder<IMarketTrade>, seller: string | undefined): SelectQueryBuilder<IMarketTrade> {
        if (nullOrWhitespace(seller)) {
            return query;
        }

        return query.andWhere('trade.address_seller = :seller', { seller: seller });
    }

    /**
     * Conversion of data from Trade  to JSON
     * @deprecated
     * Use this.serializeTradeToDto, used in the old method
     * @param {Trade} trade
     * @private
     * @return ({TradeDto})
     */
    private mapToDto(trade: Trade): TradeDto {
        return {
            buyer: trade.buyer,
            seller: trade.offer.seller,
            collectionId: +trade.offer.collectionId,
            creationDate: trade.offer.creationDate,
            metadata: trade.offer.metadata,
            price: trade.price?.toString(),
            quoteId: +trade.offer.quoteId,
            tokenId: +trade.offer.tokenId,
            tradeDate: trade.tradeDate,
        };
    }
}
