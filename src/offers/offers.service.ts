import { Bid } from './../auction/types/bid';
import { OfferTraits } from './dto/offer-traits';
import { BadRequestException, HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { Connection, Repository, SelectQueryBuilder } from 'typeorm';

import { PaginationRequest } from '../utils/pagination/pagination-request';
import { PaginationResult, PaginationResultDto } from '../utils/pagination/pagination-result';
import { OfferSortingRequest } from '../utils/sorting/sorting-request';
import { nullOrWhitespace } from '../utils/string/null-or-white-space';

import { OfferContractAskDto } from './dto/offer-dto';
import { filterAttributes, OffersFilter } from './dto/offers-filter';
import { priceTransformer } from '../utils/price-transformer';
import { BlockchainBlock, ContractAsk, SearchIndex, AuctionEntity, BidEntity } from '../entity';
import { InjectSentry, SentryService } from '../utils/sentry';
import { OffersQuerySortHelper } from './offers-query-sort-helper';
import { TypeAttributToken } from '../auction/types';
import { OfferAttributesDto } from './dto';
import { OfferAttributes } from './dto/offer-attributes';

type OfferPaginationResult = {
  items: ContractAsk[];
  itemsCount: number;
  page: number;
  pageSize: number;
};

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
        this.contractAskRepository =
            connection.manager.getRepository(ContractAsk);
        this.searchIndexRepository =
            connection.manager.getRepository(SearchIndex);
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
            offers = await this.contractAskRepository.createQueryBuilder(
                'offer',
            );
            this.addRelations(offers);

            offers = this.filter(offers, offersFilter);
            paginationResult = await this.setPagination(
                offers,
                pagination,
                sort,
            );
        } catch (e) {
            this.logger.error(e.message);
            this.sentryService
                .instance()
                .captureException(new BadRequestException(e), {
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
            items: paginationResult.items.map(
                OfferContractAskDto.fromContractAsk,
            ),
        });
    }

    private getAuctionIds(items: Array<any>): Array<number> {
        return items
            .filter((item) => item?.auction !== null)
            .map((item) => item.auction.id)
            .filter((id) => id !== null);
    }

    private async getBids(
        auctionIds: Array<number>,
    ): Promise<Array<Partial<Bid>>> {
        const queryBuilder = this.connection.manager
            .createQueryBuilder(BidEntity, 'bid')
            .select([
                'created_at',
                'updated_at',
                'amount',
                'auction_id',
                'bidder_address',
                'balance',
            ])
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
            return `select * from (values ${values.join(
                ',',
            )}) as t (collection_id, token_id)`;
        }
        return null;
    }

    private async getSearchIndex(
        sqlValues: string,
    ): Promise<Array<Partial<SearchIndex>>> {
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
                            acc[
                                `${item.key}`
                            ] = `https://ipfs.unique.network/ipfs/${image}`;
                        } else {
                            acc[`${item.key}`] = null;
                        }
                    }
                }
            }

            if (
                (item.type === TypeAttributToken.String ||
                    item.type === TypeAttributToken.Enum) &&
                !['collectionName', 'description'].includes(item.key)
            ) {
                acc.attributes.push({
                    key: item.key,
                    value:
                        item.items.length === 1 ? item.items.pop() : item.items,
                    type: item.type,
                });
            }

            return acc;
        };
    }

    async setPagination(
        query: SelectQueryBuilder<ContractAsk>,
        paramenter: PaginationRequest,
        sort: OfferSortingRequest,
    ): Promise<OfferPaginationResult> {
        function convertorFlatToObject(): (
            previousValue: any,
            currentValue: any,
            currentIndex: number,
            array: any[],
        ) => any {
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

        substitutionQuery = this.offersQuerySortHelper.applyFlatSort(
            substitutionQuery,
            sort,
        );

        const substitution = await substitutionQuery.getRawMany();
        //const source = await query.getMany();
        const itemsCount = await query.getCount();

        const source = substitution.reduce(convertorFlatToObject(), []);

        const bids = await this.getBids(this.getAuctionIds(source));

        const searchIndex = await this.getSearchIndex(
            this.sqlCollectionIdTokenId(source),
        );

        return {
            page,
            pageSize,
            itemsCount,
            items: this.parseOffers(source, bids, searchIndex),
        };
    }

    private parseOffers(
        source: any,
        bids: Partial<Bid>[],
        searchIndex: Partial<SearchIndex>[],
    ): ContractAsk[] {
        return source.reduce((acc, item) => {
            if (item.auction !== null) {
                item.auction.bids = bids.filter(
                    (bid) => bid.auctionId === item.auction.id,
                ) as any as BidEntity[];
            }
            item['tokenDescription'] = searchIndex
                .filter(
                    (index) =>
                        index.collection_id === item.collection_id &&
                        index.token_id === item.token_id,
                )
                .reduce(this.parseSearchIndex(), {
                    attributes: [],
                });

            acc.push(item);
            return acc;
        }, []);
    }

    async getOne(filter: {
        collectionId: number;
        tokenId: number;
    }): Promise<OfferContractAskDto | null> {
        const { collectionId, tokenId } = filter;

        const queryBuilder = this.connection.manager
            .createQueryBuilder(ContractAsk, 'offer')
            .where('offer.collection_id = :collectionId', { collectionId })
            .andWhere('offer.token_id = :tokenId', { tokenId })
            .andWhere('offer.status = :status', { status: 'active' });

        this.addRelations(queryBuilder);

        const source = await queryBuilder.getMany();
        const bids = await this.getBids(this.getAuctionIds(source));

        const searchIndex = await this.getSearchIndex(
            this.sqlCollectionIdTokenId(source),
        );

        const contractAsk = this.parseOffers(source, bids, searchIndex).pop();

        return contractAsk && OfferContractAskDto.fromContractAsk(contractAsk);
    }

    private addRelations(queryBuilder: SelectQueryBuilder<ContractAsk>): void {
        queryBuilder
            .leftJoinAndMapOne(
                'offer.auction',
                AuctionEntity,
                'auction',
                'auction.contract_ask_id = offer.id',
            )
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
                  return subQuery.select([
                    '_i.collection_id',
                    '_i.token_id',
                    'sum(array_count) over (partition by _i.collection_id, _i.token_id) as amount'
                  ])
                  .distinct()
                  .from((qb) => {
                    return qb.select(['_s.collection_id as collection_id', '_s.token_id as token_id', 'array_length(_s.items, 1) as array_count'])
                      .distinct()
                      .from(SearchIndex, '_s')
                      .leftJoinAndSelect(ContractAsk, 'ca', 'ca.collection_id = _s.collection_id and ca.token_id = _s.token_id')
                      .where('_s.type = :type', { type: 'Enum' })
                      .andWhere('ca.status = :status', { status: 'active' });
                  },'_i')
                },
                '_count_token',
                '_count_token.collection_id = offer.collection_id and _count_token.token_id = offer.token_id',
            )
            .leftJoinAndSelect(
                (subQuery) => {
                    return subQuery
                        .select(['auction_id as auc_id', 'bidder_address'])
                        .from(BidEntity, '_bids')
                        .where('_bids.amount > 0');
                },
                '_bids',
                '_bids.auc_id = auction.id',
            );
    }

    /**
     * Filter by Collection ID
     * @param {SelectQueryBuilder<ContractAsk>} query - Selecting data from the ContractAsk table
     * @param {Array<number>} collectionIds - Array collection ID
     * @private
     * @see OffersService.get
     * @return {SelectQueryBuilder<ContractAsk>}
     */
    private filterByCollectionId(
        query: SelectQueryBuilder<ContractAsk>,
        collectionIds?: number[],
    ): SelectQueryBuilder<ContractAsk> {
        if ((collectionIds ?? []).length <= 0) {
            return query;
        }

        return query.andWhere('offer.collection_id in (:...collectionIds)', {
            collectionIds,
        });
    }

    /**
     * Filter by Max Price
     * @param {SelectQueryBuilder<ContractAsk>} query - Selecting data from the ContractAsk table
     * @param {BigInt} maxPrice - Int max price
     * @private
     * @see OffersService.get
     * @return {SelectQueryBuilder<ContractAsk>}
     */
    private filterByMaxPrice(
        query: SelectQueryBuilder<ContractAsk>,
        maxPrice?: BigInt,
    ): SelectQueryBuilder<ContractAsk> {
        if (maxPrice == null) {
            return query;
        }
        return query.andWhere('offer.price <= :maxPrice', {
            maxPrice: priceTransformer.to(maxPrice),
        });
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
    private filterByMinPrice(
        query: SelectQueryBuilder<ContractAsk>,
        minPrice?: BigInt,
    ): SelectQueryBuilder<ContractAsk> {
        if (minPrice == null) {
            return query;
        }

        return query.andWhere('offer.price >= :minPrice', {
            minPrice: priceTransformer.to(minPrice),
        });
    }

    /**
     * Filter by Min Price
     * @description  Fetches from SearchIndex by searchText based on collection id and token id
     * @param {SelectQueryBuilder<ContractAsk>} query - Selecting data from the ContractAsk table
     * @param {String} text - Search field from SearchIndex in which traits are specified
     * @param {String} locale -
     * @param {number[]} numberOfAttributes -
     * @private
     * @see OffersService.get
     * @return SelectQueryBuilder<ContractAsk>
     */
    private filterBySearchText(
        query: SelectQueryBuilder<ContractAsk>,
        text?: string,
        locale?: string,
        numberOfAttributes?: number[],
    ): SelectQueryBuilder<ContractAsk> {
        //if(nullOrWhitespace(text) || nullOrWhitespace(locale) || (traitsCount ?? []).length === 0) return query;

        if ((numberOfAttributes ?? []).length !== 0) {
            query.andWhere(
                '_count_token.amount in (:...numberOfAttributes)',
                { numberOfAttributes },
            );
        }

        if (!nullOrWhitespace(text)) {
            query.andWhere(
                `search_filter.traits ILIKE CONCAT('%', cast(:searchText as text), '%')`,
                { searchText: text },
            );
        }

        if (!nullOrWhitespace(locale)) {
            query.andWhere(
                '(search_filter.locale is null OR search_filter.locale = :locale)',
                { locale: locale },
            );
        }

        return query;
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
    private filterBySeller(
        query: SelectQueryBuilder<ContractAsk>,
        seller?: string,
    ): SelectQueryBuilder<ContractAsk> {
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
    private filterByAuction(
        query: SelectQueryBuilder<ContractAsk>,
        bidderAddress?: string,
        isAuction?: boolean | string,
    ): SelectQueryBuilder<ContractAsk> {
        if (isAuction !== null) {
            const _auction = isAuction === 'true';
            if (_auction === true) {
                query.andWhere('auction.id is not null');
            } else {
                query.andWhere('auction.id is null');
            }
        }

        if (!nullOrWhitespace(bidderAddress)) {
            query.andWhere('(_bids.bidder_address = :bidderAddress)', {
                bidderAddress,
            });
        }

        return query;
    }
    /**
     * Filter by Traits
     * @param {SelectQueryBuilder<ContractAsk>} query - Selecting data from the ContractAsk table
     * @param {Array<number>} collectionIds - Array collection ID
     * @param {Array<string>} attributes - Array traits for token
     * @private
     * @see OffersService.get
     * @return SelectQueryBuilder<ContractAsk>
     */
    private filterByTraits(
        query: SelectQueryBuilder<ContractAsk>,
        collectionIds?: number[],
        attributes?: Array<filterAttributes>,
    ): SelectQueryBuilder<ContractAsk> {
        if ((attributes ?? []).length <= 0) {
            return query;
        } else {
            if ((collectionIds ?? []).length <= 0) {
                throw new BadRequestException({
                    statusCode: HttpStatus.BAD_REQUEST,
                    message:
                        'Not found collectionIds. Please set collectionIds to offer by filter',
                });
            } else {
                const filterAttributes = attributes.reduce(
                    (previous, current) => {
                        if (!previous[current['key']]) {
                            previous[current['key']] = [];
                        }
                        previous[current['key']].push(current['attribut']);
                        return previous;
                    },
                    {},
                );

                const keyList = [];
                for (const [key, value] of Object.entries(filterAttributes)) {
                    keyList.push(key);
                }
                query.andWhere('search_filter.key in (:...keyList)', {
                    keyList,
                });
                for (const [key, value] of Object.entries(filterAttributes)) {
                    query.andWhere('array [:...value] <@ search_filter.items', {
                        value,
                    });
                }
                return query;
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
    private filter(
        query: SelectQueryBuilder<ContractAsk>,
        offersFilter: OffersFilter,
    ): SelectQueryBuilder<ContractAsk> {
        query = this.filterByCollectionId(query, offersFilter.collectionId);
        query = this.filterByMaxPrice(query, offersFilter.maxPrice);
        query = this.filterByMinPrice(query, offersFilter.minPrice);
        query = this.filterBySeller(query, offersFilter.seller);
        query = this.filterBySearchText(
            query,
            offersFilter.searchText,
            offersFilter.searchLocale,
            offersFilter.numberOfAttributes,
        );
        query = this.filterByAuction(
            query,
            offersFilter.bidderAddress,
            offersFilter.isAuction,
        );
        query = this.filterByTraits(
            query,
            offersFilter.collectionId,
            offersFilter.attributes,
        );

        return query.andWhere(`offer.status = :status`, { status: 'active' });
    }

    public get isConnected(): boolean {
        return true;
    }

    async getAttributes(collectionId: number): Promise<OfferTraits | null> {
        let attributes = [];
        try {
            attributes = await this.connection.manager.query(
                `
      select key, trait, count(trait) from (
        select traits as trait, collection_id, token_id, key from search_index, unnest(items) traits
        where locale is not null and collection_id = $1
    ) as si
      left join contract_ask ca on ca.collection_id = si.collection_id and ca.token_id = si.token_id
      where ca.status = 'active'
    group by key, trait order by key`,
                [collectionId],
            );

            attributes = attributes.reduce((previous, current) => {
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
        } catch (e) {
            this.logger.error(e.message);
            this.sentryService
                .instance()
                .captureException(new BadRequestException(e), {
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
            attributes,
        };
    }

    async getAttributesCounts(
        args: OfferAttributesDto,
    ): Promise<Array<OfferAttributes>> {
        try {
            if ((args.collectionId ?? []).length <= 0) {
                throw new BadRequestException({
                    statusCode: HttpStatus.BAD_REQUEST,
                    message:
                        'Not found collectionIds. Please set collectionIds',
                });
            }
          const counts = await this.connection.manager.createQueryBuilder()
            .select(['"numberOfAttributes"', 'count(_j.token_id) over (partition by "numberOfAttributes") amount'])
            .distinct()
            .from((qb) => {
              return qb.select(['_i.collection_id as collection_id', '_i.token_id as token_id', 'sum(_i.array_count) over (partition by _i.collection_id, _i.token_id) "numberOfAttributes"'])
                .distinct()
                .from((qb) => {
                  return qb.select(['_p.token_id as token_id', '_p.collection_id as collection_id', '_p.array_count as array_count'])
                    .distinct()
                    .from((qb) => {
                      return qb.select(['_s.collection_id as collection_id', '_s.token_id as token_id', 'array_length(_s.items, 1) as  array_count'])
                        .distinct()
                        .from(SearchIndex, '_s')
                        .leftJoinAndSelect(ContractAsk, 'ca', 'ca.collection_id = _s.collection_id and ca.token_id = _s.token_id')
                        .where('_s.collection_id in (:...collectionIds)', { collectionIds: args.collectionId })
                        .andWhere('_s.type = :type', { type: 'Enum' })
                        .andWhere('ca.status = :status', { status: 'active' });
                    }, '_p')
                }, '_i')
            }, '_j')
            .orderBy('"numberOfAttributes"')
            .getRawMany() as Array<OfferAttributes>;

                      return counts.map((item) => {
                          return {
                            numberOfAttributes: +item.numberOfAttributes,
                            amount: +item.amount,
                          };
                      });
        } catch (e) {
            this.logger.error(e.message);
        }
    }
}
