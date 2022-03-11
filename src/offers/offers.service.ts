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
      .andWhere(`offer.status = :status`, { status: 'active' });

    this.addRelations(queryBuilder);

    const contractAsk = await queryBuilder.getOne();

    return contractAsk && OfferContractAskDto.fromContractAsk(contractAsk)
  }


  private addRelations(queryBuilder: SelectQueryBuilder<ContractAsk>): void {
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

    let matchedText = this.searchIndexRepository.createQueryBuilder('searchIndex')

    if ((traitsCount ?? []).length !== 0) {
      matchedText = matchedText.andWhere(`searchIndex.is_trait = true`);
    }

    if(!nullOrWhitespace(text)) { matchedText = matchedText.andWhere(`searchIndex.value ILIKE CONCAT('%', cast(:searchText as text), '%')`, { searchText: text }) }

    if(!nullOrWhitespace(locale) ){matchedText = matchedText.andWhere('(searchIndex.locale is null OR searchIndex.locale = :locale)', { locale: locale, }) }


    const groupedMatches = matchedText
      .select('searchIndex.collection_id, searchIndex.token_id')
      .addSelect('COUNT(searchIndex.id)', 'traitsCount')
      .groupBy('searchIndex.collection_id, searchIndex.token_id');

    //innerJoin doesn't add parentesises around joined value, which is required in case of complex subquery.
    const getQueryOld = groupedMatches.getQuery.bind(groupedMatches);
    groupedMatches.getQuery = () => `(${getQueryOld()})`;
    groupedMatches.getQuery.prototype = getQueryOld;

    if ((traitsCount ?? []).length !== 0) {
      query.innerJoin(() => groupedMatches, 'gr', `gr."collection_id" = offer."collection_id" AND gr."token_id" = offer."token_id"  AND gr."traitsCount" IN (:...traitsCount)`, {
        traitsCount: traitsCount,
      })

    } else {
      query.innerJoin(() => groupedMatches, 'gr', `gr."collection_id" = offer."collection_id" AND gr."token_id" = offer."token_id"`);
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

    return query.andWhere(`offer.status = :status`, { status: 'active' });
  }

  public get isConnected(): boolean {
    return true;
  }
}
