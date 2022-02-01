import { BadRequestException, HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { Connection, SelectQueryBuilder } from 'typeorm';

import { paginate } from '../utils/pagination/paginate';
import { PaginationRequest } from '../utils/pagination/pagination-request';
import { PaginationResult } from '../utils/pagination/pagination-result';
import { SortingOrder } from '../utils/sorting/sorting-order';
import { OfferSortingRequest } from '../utils/sorting/sorting-request';
import { equalsIgnoreCase } from '../utils/string/equals-ignore-case';
import { nullOrWhitespace } from '../utils/string/null-or-white-space';

import { OfferContractAskDto } from './dto/offer-dto';
import { OffersFilter } from './dto/offers-filter';
import { priceTransformer } from '../utils/price-transformer';
import { BlockchainBlock, ContractAsk, SearchIndex } from '../entity';
import { InjectSentry, SentryService } from '../utils/sentry';

@Injectable()
export class OffersService {
    private offerSortingColumns = ['Price', 'TokenId', 'token_id', 'CollectionId', 'collection_id'];
    private sortingColumns = [...this.offerSortingColumns, 'CreationDate'];
    private logger: Logger;

    constructor(
        @Inject('DATABASE_CONNECTION') private connection: Connection,
        @InjectSentry() private readonly sentryService: SentryService,
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
    ): Promise<PaginationResult<OfferContractAskDto>> {
        let offers: SelectQueryBuilder<ContractAsk>;
        let paginationResult;

        try {
            offers = this.connection.manager
                .createQueryBuilder(ContractAsk, 'offer')
                .innerJoinAndSelect(
                    BlockchainBlock,
                    'block',
                    'block.network = offer.network and block.block_number = offer.block_number_ask',
                )
                .select('offer')
                .addSelect('block.created_at', 'created_at')
                .innerJoinAndMapOne(
                    'offer.block',
                    BlockchainBlock,
                    'blocks',
                    'offer.network = blocks.network and blocks.block_number = offer.block_number_ask',
                );

            offers = this.filter(offers, offersFilter);
            offers = this.applySort(offers, sort);
            paginationResult = await paginate(offers, pagination);
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

        return {
            ...paginationResult,
            items: paginationResult.items.map(this.serializeOffersToDto),
        };
    }

    /**
     * Adds fields to the sort and sorts the data
     * in ascending and descending order, depending on the request
     * @param {SelectQueryBuilder<ContractAsk>} query - Selecting data from the ContractAsk table
     * @param {OfferSortingRequest} sort - Possible values: asc(Price), desc(Price), asc(TokenId), desc(TokenId), asc(CreationDate), desc(CreationDate).
     * @private
     * @see OffersService.get
     * @return {SelectQueryBuilder<ContractAsk>}
     */
    private applySort(query: SelectQueryBuilder<ContractAsk>, sort: OfferSortingRequest): SelectQueryBuilder<ContractAsk> {
        let params = [];

        for (let param of sort.sort ?? []) {
            let column = this.sortingColumns.find((column) => equalsIgnoreCase(param.column, column));

            if (column === 'tokenid' || column === 'TokenId') {
                column = 'token_id';
            }
            if (column === 'creationdate' || column === 'CreationDate') {
                column = 'created_at';
            }
            if (column === 'collectionid' || column === 'CollectionId') {
                column = 'collection_id';
            }
            if (column === null) continue;
            params.push({ ...param, column });
        }

        let first = true;
        for (let param of params) {
            let table = this.offerSortingColumns.indexOf(param.column) > -1 ? 'offer' : 'block';
            query = query[first ? 'orderBy' : 'addOrderBy'](`${table}.${param.column}`, param.order === SortingOrder.Asc ? 'ASC' : 'DESC');
            first = false;
        }

        return query;
    }
    /**
     * Conversion of data from ContractAsk to JSON
     * @example: items: OfferContractAskDto[]
     * @param {ContractAsk} offer - DTO Offer Contract Ask Dto
     * @private
     * @see OffersService.get
     * @return {OfferContractAskDto}
     */
    private serializeOffersToDto(offer: ContractAsk): OfferContractAskDto {
        return {
            collectionId: +offer.collection_id,
            tokenId: +offer.token_id,
            price: offer.price.toString(),
            quoteId: +offer.currency,
            seller: offer.address_from,
            creationDate: offer.block.created_at,
        };
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
     * @private
     * @see OffersService.get
     * @return SelectQueryBuilder<ContractAsk>
     */
    private filterBySearchText(query: SelectQueryBuilder<ContractAsk>, text?: string, locale?: string): SelectQueryBuilder<ContractAsk> {
        if (nullOrWhitespace(text)) {
            return query;
        }

        let matchedText = this.connection
            .createQueryBuilder(SearchIndex, 'searchIndex')
            .andWhere(`searchIndex.value like CONCAT('%', cast(:searchText as text), '%')`, { searchText: text });
        if (!nullOrWhitespace(locale)) {
            matchedText = matchedText.andWhere('(searchIndex.locale is null OR searchIndex.locale = :locale)', {
                locale: locale,
            });
        }

        const groupedMatches = matchedText
            .select('searchIndex.collection_id, searchIndex.token_id')
            .groupBy('searchIndex.collection_id, searchIndex.token_id');
        //innerJoin doesn't add parentesises around joined value, which is required in case of complex subquery.
        const getQueryOld = groupedMatches.getQuery.bind(groupedMatches);
        groupedMatches.getQuery = () => `(${getQueryOld()})`;
        groupedMatches.getQuery.prototype = getQueryOld;
        return query.innerJoin(
            () => groupedMatches,
            'gr',
            'gr."collection_id" = offer."collection_id" AND gr."token_id" = offer."token_id"',
        );
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
     * Filter by Traits Count
     * @param {SelectQueryBuilder<ContractAsk>} query - Selecting data from the ContractAsk table
     * @param {Array<number>} traitsCount - Array numbers traits
     * @private
     * @see OffersService.get
     * @return SelectQueryBuilder<ContractAsk>
     */
    private filterByTraitsCount(query: SelectQueryBuilder<ContractAsk>, traitsCount?: number[]): SelectQueryBuilder<ContractAsk> {
        if ((traitsCount ?? []).length <= 0) {
            return query;
        }

        return query.andWhere(`offer.indexData.is_trait ? 'traits') in (:...traitsCount)`, {
            traitsCount: traitsCount,
        });
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
        query = this.filterBySearchText(query, offersFilter.searchText, offersFilter.searchLocale);
        // query = this.filterByTraitsCount(query, offersFilter.traitsCount);
        const qr = query.andWhere(`offer.status = :status`, { status: 'active' });
        return qr;
    }
}
