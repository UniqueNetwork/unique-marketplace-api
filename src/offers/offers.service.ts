import { Inject, Injectable } from '@nestjs/common';
import { Connection, SelectQueryBuilder } from 'typeorm';

import { paginate } from '../utils/pagination/paginate';
import { PaginationRequest } from '../utils/pagination/pagination-request';
import { PaginationResult } from '../utils/pagination/pagination-result';
import { SortingOrder } from '../utils/sorting/sorting-order';
import { OfferSortingRequest } from '../utils/sorting/sorting-request';
import { equalsIgnoreCase } from '../utils/string/equals-ignore-case';
import { nullOrWhitespace } from '../utils/string/null-or-white-space';

import { OfferContractAskDto, OfferDto } from './dto/offer-dto';
import { OffersFilter } from './dto/offers-filter';
import { Offer, TokenTextSearch } from '../entity';
import { priceTransformer } from '../utils/price-transformer';
import { BlockchainBlock, ContractAsk, SearchIndex } from '../entity/evm';

@Injectable()
export class OffersService {
    private sortingColumns = ['Price', 'TokenId', 'CreationDate'];

    constructor(@Inject('DATABASE_CONNECTION') private connection: Connection) {}

    /**
     * Get Offers
     * @param pagination
     * @param offersFilter
     * @param sort
     */
    async get(pagination: PaginationRequest, offersFilter: OffersFilter, sort: OfferSortingRequest): Promise<PaginationResult<OfferContractAskDto>> {
        let offers = this.connection.manager
            .createQueryBuilder(ContractAsk, 'offer')
            .leftJoinAndMapOne('offer.blockchain', BlockchainBlock, 'block', 'block.network = offer.network and block.block_number = offer.block_number_ask');

        offers = this.filter(offers, offersFilter);
        offers = this.applySort(offers, sort);
        const paginationResult = await paginate(offers, pagination);
        //console.dir(paginationResult, { depth: 4 });
        return {
            ...paginationResult,
            items: paginationResult.items.map(this.serializeOffersToDto),
        };
    }

    private serializeOffersToDto(offer: ContractAsk): OfferContractAskDto {
        return {
            collectionId: +offer.collection_id,
            tokenId: +offer.token_id,
            price: offer.price.toString(),
            quoteId: +offer.currency,
            seller: offer.address_from,
            creationDate: offer.blockchain.created_at,
        };
    }

    private applySort(query: SelectQueryBuilder<ContractAsk>, sort: OfferSortingRequest): SelectQueryBuilder<ContractAsk> {
        const params = (sort.sort ?? [])
            .map((s) => ({
                ...s,
                column: this.sortingColumns.find((allowedColumn) => equalsIgnoreCase(s.column, allowedColumn)),
            }))
            .filter((s) => s.column != null);
        if (params.length <= 0) {
            return query;
        }

        query = query.orderBy(`offer.${params[0].column}`, params[0].order === SortingOrder.Asc ? 'ASC' : 'DESC');
        for (let i = 1; i < params.length; i++) {
            query = query.addOrderBy(`offer.${params[i].column}`, params[i].order === SortingOrder.Asc ? 'ASC' : 'DESC');
        }

        return query;
    }

    private filterByCollectionId(query: SelectQueryBuilder<ContractAsk>, collectionIds?: number[]): SelectQueryBuilder<ContractAsk> {
        if ((collectionIds ?? []).length <= 0) {
            return query;
        }

        return query.andWhere('offer.collection_id in (:...collectionIds)', { collectionIds });
    }

    private filterByMaxPrice(query: SelectQueryBuilder<ContractAsk>, maxPrice?: BigInt): SelectQueryBuilder<ContractAsk> {
        if (maxPrice == null) {
            return query;
        }

        return query.andWhere('offer.price <= :maxPrice', { maxPrice: priceTransformer.to(maxPrice) });
    }

    private filterByMinPrice(query: SelectQueryBuilder<ContractAsk>, minPrice?: BigInt): SelectQueryBuilder<ContractAsk> {
        if (minPrice == null) {
            return query;
        }

        return query.andWhere('offer.price >= :minPrice', { minPrice: priceTransformer.to(minPrice) });
    }

    private filterBySearchText(query: SelectQueryBuilder<ContractAsk>, text?: string, locale?: string): SelectQueryBuilder<ContractAsk> {
        if (nullOrWhitespace(text)) {
            return query;
        }

        let matchedText = this.connection
            .createQueryBuilder(SearchIndex, 'searchIndex')
            .andWhere(`searchIndex.value like CONCAT('%', cast(:searchText as text), '%')`, { searchText: text });
        if (!nullOrWhitespace(locale)) {
            matchedText = matchedText.andWhere('(searchIndex.locale is null OR searchIndex.locale = :locale)', { locale: locale });
        }

        const groupedMatches = matchedText.select('searchIndex.collection_id, searchIndex.token_id').groupBy('searchIndex.collection_id, searchIndex.token_id');
        //innerJoin doesn't add parentesises around joined value, which is required in case of complex subquery.
        const getQueryOld = groupedMatches.getQuery.bind(groupedMatches);
        groupedMatches.getQuery = () => `(${getQueryOld()})`;
        groupedMatches.getQuery.prototype = getQueryOld;
        return query.innerJoin(() => groupedMatches, 'gr', 'gr."collection_id" = offer."collection_id" AND gr."token_id" = offer."token_id"');
    }

    private filterBySeller(query: SelectQueryBuilder<ContractAsk>, seller?: string): SelectQueryBuilder<ContractAsk> {
        if (nullOrWhitespace(seller)) {
            return query;
        }

        return query.andWhere('offer.address_from = :seller', { seller });
    }

    private filterByTraitsCount(query: SelectQueryBuilder<ContractAsk>, traitsCount?: number[]): SelectQueryBuilder<ContractAsk> {
        if ((traitsCount ?? []).length <= 0) {
            return query;
        }

        return query.andWhere(`offer.Metadata ? 'traits' AND jsonb_array_length(offer."Metadata"->'traits') in (:...traitsCount)`, {
            traitsCount: traitsCount,
        });
    }

    private filter(query: SelectQueryBuilder<ContractAsk>, offersFilter: OffersFilter): SelectQueryBuilder<ContractAsk> {
        query = this.filterByCollectionId(query, offersFilter.collectionId);
        query = this.filterByMaxPrice(query, offersFilter.maxPrice);
        query = this.filterByMinPrice(query, offersFilter.minPrice);
        query = this.filterBySeller(query, offersFilter.seller);
        query = this.filterBySearchText(query, offersFilter.searchText, offersFilter.searchLocale);
        query = this.filterByTraitsCount(query, offersFilter.traitsCount);

        return query;
    }

    private mapToDto(offer: Offer): OfferDto {
        return {
            collectionId: +offer.collectionId,
            tokenId: +offer.tokenId,
            price: offer.price.toString(),
            quoteId: +offer.quoteId,
            seller: offer.seller,
            metadata: offer.metadata,
            creationDate: offer.creationDate,
        };
    }
}
