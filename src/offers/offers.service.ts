import { Inject, Injectable } from '@nestjs/common';
import { Connection, SelectQueryBuilder } from 'typeorm';
import { decodeAddress, encodeAddress } from '@polkadot/util-crypto';

import { paginate } from '../utils/pagination/paginate';
import { PaginationRequest } from '../utils/pagination/pagination-request';
import { PaginationResult } from '../utils/pagination/pagination-result';
import { SortingOrder } from '../utils/sorting/sorting-order';
import { OfferSortingRequest } from '../utils/sorting/sorting-request';
import { equalsIgnoreCase } from '../utils/string/equals-ignore-case';
import { nullOrWhitespace } from '../utils/string/null-or-white-space';

import { OfferDto } from './offer-dto';
import { OffersFilter } from './offers-filter';
import { Offer, TokenTextSearch } from '../entity';
import { priceTransformer } from '../utils/price-transformer';

@Injectable()
export class OffersService {
    private sortingColumns = ['Price', 'TokenId', 'CreationDate'];

    constructor(@Inject('DATABASE_CONNECTION') private connection: Connection) {}

    applySort(query: SelectQueryBuilder<Offer>, sort: OfferSortingRequest): SelectQueryBuilder<Offer> {
        const params = (sort.sort ?? [])
            .map((s) => ({ ...s, column: this.sortingColumns.find((allowedColumn) => equalsIgnoreCase(s.column, allowedColumn)) }))
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

    filterByCollectionId(query: SelectQueryBuilder<Offer>, collectionIds?: number[]): SelectQueryBuilder<Offer> {
        if ((collectionIds ?? []).length <= 0) {
            return query;
        }

        return query.andWhere('offer.CollectionId in (:...collectionIds)', { collectionIds: collectionIds });
    }

    filterByMaxPrice(query: SelectQueryBuilder<Offer>, maxPrice?: BigInt): SelectQueryBuilder<Offer> {
        if (maxPrice == null) {
            return query;
        }

        return query.andWhere('offer.Price <= :maxPrice', { maxPrice: priceTransformer.to(maxPrice) });
    }

    filterByMinPrice(query: SelectQueryBuilder<Offer>, minPrice?: BigInt): SelectQueryBuilder<Offer> {
        if (minPrice == null) {
            return query;
        }

        return query.andWhere('offer.Price >= :minPrice', { minPrice: priceTransformer.to(minPrice) });
    }

    filterBySearchText(query: SelectQueryBuilder<Offer>, text?: string, locale?: string): SelectQueryBuilder<Offer> {
        if (nullOrWhitespace(text)) {
            return query;
        }

        let matchedText = this.connection
            .createQueryBuilder(TokenTextSearch, 'tokenTextSearch')
            .andWhere(`tokenTextSearch.Text ilike CONCAT('%', cast(:searchText as text), '%')`, { searchText: text });
        if (!nullOrWhitespace(locale)) {
            matchedText = matchedText.andWhere('(tokenTextSearch.Locale is null OR tokenTextSearch.Locale = :locale)', { locale: locale });
        }

        const groupedMatches = matchedText
            .select('tokenTextSearch.CollectionId, tokenTextSearch.TokenId')
            .groupBy('tokenTextSearch.CollectionId, tokenTextSearch.TokenId');
        //innerJoin doesn't add parentesises around joined value, which is required in case of complex subquery.
        const getQueryOld = groupedMatches.getQuery.bind(groupedMatches);
        groupedMatches.getQuery = () => `(${getQueryOld()})`;
        groupedMatches.getQuery.prototype = getQueryOld;
        return query.innerJoin(() => groupedMatches, 'gr', 'gr."CollectionId" = offer."CollectionId" AND gr."TokenId" = offer."TokenId"');
    }

    filterBySeller(query: SelectQueryBuilder<Offer>, seller?: string): SelectQueryBuilder<Offer> {
        if (nullOrWhitespace(seller)) {
            return query;
        }

        const key = Buffer.from(decodeAddress(seller)).toString('base64');

        return query.andWhere('offer.Seller = :seller', { seller: key });
    }

    filterByTraitsCount(query: SelectQueryBuilder<Offer>, traitsCount?: number[]): SelectQueryBuilder<Offer> {
        if ((traitsCount ?? []).length <= 0) {
            return query;
        }

        return query.andWhere(`offer.Metadata ? 'traits' AND jsonb_array_length(offer."Metadata"->'traits') in (:...traitsCount)`, {
            traitsCount: traitsCount,
        });
    }

    filter(query: SelectQueryBuilder<Offer>, offersFilter: OffersFilter): SelectQueryBuilder<Offer> {
        query = this.filterByCollectionId(query, offersFilter.collectionId);
        query = this.filterByMaxPrice(query, offersFilter.maxPrice);
        query = this.filterByMinPrice(query, offersFilter.minPrice);
        query = this.filterBySeller(query, offersFilter.seller);
        query = this.filterBySearchText(query, offersFilter.searchText, offersFilter.searchLocale);
        query = this.filterByTraitsCount(query, offersFilter.traitsCount);

        return query.andWhere('offer.OfferStatus = 1');
    }

    mapToDto(offer: Offer): OfferDto {
        return {
            collectionId: +offer.collectionId,
            tokenId: +offer.tokenId,
            price: offer.price.toString(),
            quoteId: +offer.quoteId,
            seller: offer.seller && encodeAddress(Buffer.from(offer.seller, 'base64')),
            metadata: offer.metadata,
            creationDate: offer.creationDate,
        };
    }

    async get(pagination: PaginationRequest, offersFilter: OffersFilter, sort: OfferSortingRequest): Promise<PaginationResult<OfferDto>> {
        let offers = this.connection.manager.createQueryBuilder(Offer, 'offer').where('offer.OfferStatus = 1');
        offers = this.filter(offers, offersFilter);

        offers = this.applySort(offers, sort);

        const paginationResult = await paginate(offers, pagination);

        return {
            ...paginationResult,
            items: paginationResult.items.map(this.mapToDto),
        };
    }
}
