import '@polkadot/api-augment/polkadot';
import { HttpStatus, Inject, Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { MarketConfig } from '../../config/market-config';
import { Connection, Repository } from 'typeorm';
import { CollectionImportType, CollectionStatus, DecodedCollection, ImportByIdResult } from '../types';
import { CollectionsFilter, DisableCollectionResult, EnableCollectionResult, ListCollectionResult } from '../dto';
import { Collection } from '../../entity';
import { ProxyCollection } from '../../utils/blockchain';
import { InjectUniqueAPI } from '../../blockchain';

@Injectable()
export class CollectionsService implements OnModuleInit {
  private readonly collectionsRepository: Repository<Collection>;
  private readonly logger: Logger;

  constructor(
    @Inject('DATABASE_CONNECTION') private connection: Connection,
    @InjectUniqueAPI() private unique,
    @Inject('CONFIG') private config: MarketConfig,
  ) {
    this.collectionsRepository = connection.getRepository(Collection);
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
   * @param {Number} id - collection id from unique network
   * @param {CollectionImportType} importType - where the collection is imported from (Env/Api)
   * @return ({Promise<ImportByIdResult>})
   */
  async importById(id: number, importType: CollectionImportType): Promise<ImportByIdResult> {
    const proxyCollection = ProxyCollection.getInstance(this.unique);
    const collection = await proxyCollection.getById(id);

    const decoded: DecodedCollection = {
      owner: collection?.collection?.owner,
      mode: collection?.collection?.mode,
      tokenPrefix: collection?.tokenPrefix,
      name: collection?.name,
      description: collection?.description,
    };

    const entity = this.collectionsRepository.create(decoded);

    const existing = await this.findById(id);

    if (existing) {
      await this.collectionsRepository.save({ id: existing.id, ...entity });

      const collection = { ...existing, ...entity };

      return {
        collection,
        message: `Collection #${id} already exists`,
      };
    } else {
      await this.collectionsRepository.save({ id, importType, ...entity });

      const collection = { ...existing, ...entity, importType };

      return {
        collection,
        message: `Collection #${id} successfully created`,
      };
    }
  }

  /**
   * Enable collection by ID
   * @param {Number} id - collection id
   * @return ({Promise<EnableCollectionResult>})
   */
  async enableById(id: number): Promise<EnableCollectionResult> {
    const { collection } = await this.importById(id, CollectionImportType.Api);

    await this.collectionsRepository.update(id, { status: CollectionStatus.Enabled });

    const message = collection.status === CollectionStatus.Enabled ? `Collection #${id} has already enabled` : `Collection #${id} successfully enabled`;

    return {
      statusCode: HttpStatus.OK,
      message,
      data: { ...collection, status: CollectionStatus.Enabled },
    };
  }

  /**
   * Disable collection by ID
   * @param {Number} id - collection id
   * @return ({Promise<DisableCollectionResult>})
   */
  async disableById(id: number): Promise<DisableCollectionResult> {
    const collection = await this.collectionsRepository.findOne(id);

    if (!collection) throw new NotFoundException(`Collection #${id} not found`);

    const message =
      collection.status === CollectionStatus.Disabled
        ? `Collection #${collection.id} has already disabled`
        : `Collection #${collection.id} successfully disabled`;

    await this.collectionsRepository.update(id, { status: CollectionStatus.Disabled });

    return {
      statusCode: HttpStatus.OK,
      message,
      data: { ...collection, status: CollectionStatus.Disabled },
    };
  }

  /**
   * Update allowed tokens for collection
   * @param {Number} id - id collection
   * @param {String} tokens - string data. Example: '2,17,21-42'
   * @return ({Promise<void>})
   */
  async updateAllowedTokens(id: number, tokens: string): Promise<void> {
    const collection = await this.collectionsRepository.findOne(id);

    if (!collection) throw new NotFoundException(`Collection #${id} not found`);

    await this.collectionsRepository.update(id, { allowedTokens: tokens });
  }

  /**
   * Find collection by ID in database
   * @param {Number} id - collection id
   * @return ({Promise<Collection>})
   */
  async findById(id: number): Promise<Collection> {
    return await this.collectionsRepository.findOne(id);
  }

  /**
   * Find array of collection in database
   * @param {CollectionsFilter} filter - filter params
   * @return ({Promise<ListCollectionResult>})
   */
  async findAll(filter: CollectionsFilter): Promise<ListCollectionResult> {
    if (filter.collectionId) {
      return {
        statusCode: HttpStatus.OK,
        message: '',
        data: await this.collectionsRepository.find({
          where: {
            id: filter.collectionId,
          },
        }),
      };
    } else {
      return {
        statusCode: HttpStatus.OK,
        message: '',
        data: await this.collectionsRepository.find(),
      };
    }
  }

  /**
   * Get ALL collections ids in database
   * @return ({Promise<number[]>})
   */
  async getCollectionIds(): Promise<number[]> {
    const collections = await this.collectionsRepository.find();

    return collections.map((i) => Number(i.id));
  }

  /**
   * Get Enabled collections ids in database
   * @return ({Promise<number[]>})
   */
  async getEnabledCollectionIds(): Promise<number[]> {
    const collections = await this.collectionsRepository.find({
      where: { status: CollectionStatus.Enabled },
    });

    return collections.map((i) => Number(i.id));
  }
}
