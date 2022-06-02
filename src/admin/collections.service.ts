import { Inject, Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { ApiPromise } from '@polkadot/api';
import { MarketConfig } from 'src/config/market-config';
import { Collection } from 'src/entity';
import { Connection, Repository } from 'typeorm';
import { decodeCollection } from './utils';
import { CollectionImportType, CollectionStatus, DecodedCollection, HumanizedCollection, ImportByIdResult } from './types/collection';

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
      const { message } = await this.importById(collectionId, CollectionImportType.Env);

      this.logger.debug(message);
    }
  }

  /**
   * Import collection from unique network by collection id and save to database
   * If collection already exists in database - update record
   * If collection not found in chain its created with empty data
   * @param id - collection id from unique network
   * @param importType - where the collection is imported from (Env/Api)
   * @return ({Promise<Collection>})
   */
  async importById(id: number, importType: CollectionImportType): Promise<ImportByIdResult> {
    const query = await this.unique.query.common.collectionById(id);

    const humanized = query.toHuman() as any as HumanizedCollection;

    if (humanized === null) this.logger.warn(`Collection #${id} not found in chain`);

    const decoded: DecodedCollection = decodeCollection(humanized);

    const entity = this.collectionsRepository.create(decoded);

    const existing = await this.findById(id);

    if (existing) {
      this.logger.debug(`Collection #${id} already exists`);

      const collection = await this.collectionsRepository.save({ id: existing.id, ...entity });

      return {
        collection,
        message: `Collection #${id} already exists`,
      };
    } else {
      const collection = await this.collectionsRepository.save({ id, importType, ...entity });

      return {
        collection,
        message: `Collection #${id} successfully created`,
      };
    }
  }

  /**
   * Enable collection by ID
   * @param id - collection id
   * @return ({Promise<Collection>})
   */
  async enableById(id: number): Promise<Collection> {
    const collection = await this.collectionsRepository.findOne(id);

    if (!collection) throw new NotFoundException(`Collection #${id} not found`);

    await this.collectionsRepository.update(id, { status: CollectionStatus.Enabled });

    return { ...collection, status: CollectionStatus.Enabled };
  }

  /**
   * Disable collection by ID
   * @param id - collection id
   * @return ({Promise<Collection>})
   */
  async disableById(id: number): Promise<Collection> {
    const collection = await this.collectionsRepository.findOne(id);

    if (!collection) throw new NotFoundException(`Collection #${id} not found`);

    await this.collectionsRepository.update(id, { status: CollectionStatus.Disabled });

    return { ...collection, status: CollectionStatus.Disabled };
  }

  /**
   * Find collection by ID in database
   * @param id - collection id
   * @return ({Promise<Collection>})
   */
  async findById(id: number): Promise<Collection> {
    return await this.collectionsRepository.findOne(id);
  }

  /**
   * Find array of collection in database
   * @return ({Promise<Collection[]>})
   */
  async findAll(): Promise<Collection[]> {
    return await this.collectionsRepository.find();
  }

  /**
   * Get collections ids in database
   * @return ({Promise<number[]>})
   */
  async getCollectionIds(): Promise<number[]> {
    const collections = await this.collectionsRepository.find();

    return collections.map((i) => Number(i.id));
  }
}
