import { BadRequestException, HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { InjectSentry, SentryService } from '../utils/sentry';
import { Connection, SelectQueryBuilder } from 'typeorm';
import { OffersService } from './offers.service';
import { ContractAsk, OfferFilters } from '../entity';
import { OfferAttributes } from './dto/offer-attributes';
import { OfferTraits, TraitDto } from './dto';

@Injectable()
export class OffersFilterService {
  private logger: Logger;

  constructor(
    @Inject('DATABASE_CONNECTION') private connection: Connection,
    @InjectSentry() private readonly sentryService: SentryService,
  ) {
    this.logger = new Logger(OffersService.name);
  }

  public addSearchIndex(queryBuilder: SelectQueryBuilder<ContractAsk>): SelectQueryBuilder<ContractAsk> {
    return queryBuilder;
  }

  public offerFilters(): SelectQueryBuilder<OfferFilters> {
    const queryBuilder = this.connection.createQueryBuilder(OfferFilters, 'offer_filters');
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
      /**
       * select distinct key, traits,
       count(traits) over (partition by traits, key)
       from v_offers_search where  collection_id  = 1 and locale is not null
       */
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
      attributes: attributes.reduce((previous, current) => {
        const tempObj = {
          key: current['trait'],
          count: +current['count'],
        };

        if (!previous[current['key']]) {
          previous[current['key']] = [];
        }

        previous[current['key']].push(tempObj);
        return previous;
      }, {}),
    };
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
}
