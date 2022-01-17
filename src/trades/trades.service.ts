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
import { MarketTradeDto, TradeDto } from './trade-dto';
import { MarketTrade } from '../entity/evm';

@Injectable()
export class TradesService {
    private offerSortingColumns = ['Price', 'TokenId', 'CollectionId'];
    private sortingColumns = [...this.offerSortingColumns, 'TradeDate'];

    constructor(@Inject('DATABASE_CONNECTION') private connection: Connection) {}

    async get(
        collectionIds: number[] | undefined,
        seller: string | undefined,
        paginationRequest: PaginationRequest,
        sort: TradeSortingRequest,
    ): Promise<PaginationResult<MarketTradeDto>> {
        let tradesQuery = this.connection.manager.createQueryBuilder(MarketTrade, 'trade')
         // .innerJoinAndSelect('trade.offer', 'offer');

        tradesQuery = this.filterByCollectionIds(tradesQuery, collectionIds);
        //tradesQuery = this.filterBySeller(tradesQuery, seller);
        tradesQuery = this.applySort(tradesQuery, sort);

        const paginationResult = await paginate(tradesQuery, paginationRequest);

        return {
            ...paginationResult,
            items: paginationResult.items.map((t) => this.serializeTradeToDto(t)),
        };
    }

    private serializeTradeToDto(trade: MarketTrade): MarketTradeDto {
      return {
        collection_id: trade.collection_id,
        token_id: trade.token_id,
        network: trade.network,
        price: trade.price?.toString(),
        currency: trade.currency?.toString(),
        address_seller: trade.address_seller,
        address_buyer: trade.address_buyer,
        ask_created_at: trade.ask_created_at,
        buy_created_at: trade.buy_created_at,
        block_number_ask: trade.block_number_ask,
        block_number_buy: trade.block_number_buy
      };
    }

    private applySort(query: SelectQueryBuilder<MarketTrade>, sort: TradeSortingRequest): SelectQueryBuilder<MarketTrade> {
        let params = [];

        for (let param of sort.sort ?? []) {
            let column = this.sortingColumns.find((column) => equalsIgnoreCase(param.column, column));
            if (column === null) continue;
            params.push({ ...param, column });
        }

        if (params.length <= 0) {
            return query;
        }

        let first = true;
        for (let param of params) {
            let table = this.offerSortingColumns.indexOf(param.column) > -1 ? 'offer' : 'trade';
            query = query[first ? 'orderBy' : 'addOrderBy'](`${table}.${param.column}`, param.order === SortingOrder.Asc ? 'ASC' : 'DESC');
            first = false;
        }

        return query;
    }

    private filterByCollectionIds(query: SelectQueryBuilder<MarketTrade>, collectionIds: number[] | undefined) {
        if (collectionIds == null || collectionIds.length <= 0) {
            return query;
        }

        return query.andWhere('offer.CollectionId in (:...collectionIds)', { collectionIds });
    }

     private filterBySeller(query: SelectQueryBuilder<MarketTrade>, seller: string | undefined): SelectQueryBuilder<MarketTrade> {
        if (nullOrWhitespace(seller)) {
            return query;
        }

        return query.andWhere('offer.Seller = :seller', { seller: seller });
    }



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
