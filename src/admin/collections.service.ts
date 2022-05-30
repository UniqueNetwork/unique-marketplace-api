import { BadRequestException, Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ApiPromise } from '@polkadot/api';
import { MarketConfig } from 'src/config/market-config';
import { Collection } from 'src/entity';
import { Connection, DeleteResult, Repository } from 'typeorm';
import { decodeCollection } from './utils';

@Injectable()
export class CollectionsService implements OnModuleInit {
  private readonly collectionsRepository: Repository<Collection>;
  private readonly logger: Logger;

  constructor(
    @Inject('DATABASE_CONNECTION') private db: Connection,
    @Inject('UNIQUE_API') private unique: ApiPromise,
    @Inject('CONFIG') private config: MarketConfig,
  ) {
    this.collectionsRepository = db.getRepository(Collection);
    this.logger = new Logger(CollectionsService.name);
  }

  /**
   * Import collections by ids concatiated between database and config
   */
  async onModuleInit(): Promise<void> {
    const idsFromConfig = this.config.blockchain.unique.collectionIds;

    const idsFromDatabase = await this.getCollectionIds();

    const collectionIds = [...new Set([...idsFromConfig, ...idsFromDatabase])];

    this.logger.debug(`Import collection by ids ${collectionIds} ...`);

    for (const collectionId of collectionIds) {
      await this.importById(collectionId);

      this.logger.debug(`Collection #${collectionId} imported.`);
    }
  }

  /**
   * Import collection from unique network by collection id and save to database
   * If collection already exists in database - update record
   * If collection not found in chain its created with empty data
   * @param id - collection id from unique network
   */
  async importById(id: number): Promise<Collection> {
    const data = await this.unique.query.common.collectionById(id);

    const collection = data.toHuman();

    if (collection === null) this.logger.warn(`Collection #${id} not found in chain`);

    const args = collection ? decodeCollection(collection) : {};

    const entity = this.collectionsRepository.create(args);

    return await this.createOrUpdate(id, entity);
  }

  /**
   * Remove collection by ID in database
   * @param id - collection id
   */
  async deleteById(id: number): Promise<DeleteResult> {
    return await this.collectionsRepository.delete(id);
  }

  /**
   * Find collection by ID in database
   * @param id - collection id
   */
  async findById(id: number): Promise<Collection> {
    return await this.collectionsRepository.findOne(id);
  }

  /**
   * Find array of collection in database
   */
  async findAll(): Promise<Collection[]> {
    return await this.collectionsRepository.find();
  }

  /**
   * Get collections ids in database
   */
  async getCollectionIds(): Promise<number[]> {
    const collections = await this.collectionsRepository.find();

    return collections.map((i) => Number(i.id));
  }

  /**
   * Create or update if exists collection in database
   * @param id - collection id
   * @param entity - collection object
   */
  private async createOrUpdate(id: number, entity: Collection): Promise<Collection> {
    const collection = await this.findById(id);

    if (collection) {
      this.logger.debug(`Collection #${id} already exists, update ...`);

      return await this.collectionsRepository.save({ id: collection.id, ...entity });
    } else {
      return await this.collectionsRepository.save({ id, ...entity });
    }
  }
}
