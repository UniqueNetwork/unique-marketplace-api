import { Inject, Injectable, Logger, NotFoundException, OnModuleInit, HttpStatus, BadRequestException } from '@nestjs/common';
import { MarketConfig } from 'src/config/market-config';
import { Collection } from 'src/entity';
import { Connection, Repository } from 'typeorm';
import { decodeCollection } from '../utils';
import { CollectionImportType, CollectionStatus, DecodedCollection, HumanizedCollection, ImportByIdResult } from '../types';
import { CollectionsFilter, EnableCollectionResult, ListCollectionResult, DisableCollectionResult, MassFixPriceSaleResult, MassFixPriceSaleDTO } from '../dto';
import { Web3Service } from './web3.service';
import { subToEth } from 'src/utils/blockchain/web3';
import { Keyring } from '@polkadot/api';

@Injectable()
export class CollectionsService implements OnModuleInit {
  private readonly collectionsRepository: Repository<Collection>;
  private readonly logger: Logger;

  constructor(
    @Inject('DATABASE_CONNECTION') private db: Connection,
    @Inject('UNIQUE_API') private unique,
    @Inject('CONFIG') private config: MarketConfig,
    private readonly web3: Web3Service,
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
   * @param {Number} id - collection id from unique network
   * @param {CollectionImportType} importType - where the collection is imported from (Env/Api)
   * @return ({Promise<ImportByIdResult>})
   */
  async importById(id: number, importType: CollectionImportType): Promise<ImportByIdResult> {
    const query = await this.unique.query.common.collectionById(id);

    const humanized = query.toHuman() as any as HumanizedCollection;

    if (humanized === null) this.logger.warn(`Collection #${id} not found in chain`);

    const decoded: DecodedCollection = decodeCollection(humanized);

    const entity = this.collectionsRepository.create(decoded);

    const existing = await this.findById(id);

    if (existing) {
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
   * @param {Number} id - collection id
   * @return ({Promise<EnableCollectionResult>})
   */
  async enableById(id: number): Promise<EnableCollectionResult> {
    const { message, collection } = await this.importById(id, CollectionImportType.Api);

    await this.collectionsRepository.update(id, { status: CollectionStatus.Enabled });

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

    await this.collectionsRepository.update(id, { status: CollectionStatus.Disabled });

    return {
      statusCode: HttpStatus.OK,
      message: `Сollection #${collection.id} successfully disabled`,
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
    const collections = await this.collectionsRepository.find({ where: { status: CollectionStatus.Enabled } });

    return collections.map((i) => Number(i.id));
  }

  /**
   * Mass fix price sale
   * @param {MassFixPriceSaleDTO} data - collectionId and price
   * @return ({Promise<MassFixPriceSaleResult>})
   */
  async massFixPriceSale(data: MassFixPriceSaleDTO): Promise<MassFixPriceSaleResult> {
    const { collectionId, price } = data;

    const enabledIds = await this.getEnabledCollectionIds();

    if (!enabledIds.includes(collectionId)) throw new BadRequestException(`Collection #${collectionId} not enabled`);

    const collectionById = await this.unique.rpc.unique.collectionById(collectionId);

    const collectionInChain = collectionById.unwrapOr(null);

    if (collectionInChain === null) throw new BadRequestException(`Collection #${collectionId} not found in chain`);

    const keyring = new Keyring({ type: 'sr25519' });

    const { mainSaleSeed } = this.config;

    const marketContractAddress = this.config.blockchain.unique.contractAddress;

    const collectionContract = this.web3.getCollectionContract(collectionId);
    const marketContract = this.web3.getMarketContract(marketContractAddress);

    const signer = keyring.addFromUri(mainSaleSeed);

    const accountTokens = await this.unique.rpc.unique.accountTokens(collectionId, {
      Substrate: signer.address,
    });

    const tokenIds = accountTokens.toHuman().map((i: string) => Number(i));

    for (const tokenId of tokenIds) {
      const nonce = await this.unique.rpc.system.accountNextIndex(signer.address);

      const txHash = await this.unique.tx.unique.transfer({ Ethereum: subToEth(signer.address) }, collectionId, tokenId, 1).signAndSend(signer, { nonce });

      this.logger.debug(`massFixPriceSale: Transfer token #${tokenId}: ${txHash.toHuman()}`);
    }

    for (const tokenId of tokenIds) {
      const nonce = await this.unique.rpc.system.accountNextIndex(signer.address);

      const txHash = await this.unique.tx.evm
        .call(
          subToEth(signer.address),
          collectionContract.options.address,
          collectionContract.methods.approve(marketContract.options.address, tokenId).encodeABI(),
          0, // value
          2_500_000, // gas
          await this.web3.getGasPrice(),
          null,
          null,
          [],
        )
        .signAndSend(signer, { nonce });

      this.logger.debug(`massFixPriceSale: Approve token #${tokenId}: ${txHash.toHuman()}`);
    }

    for (const tokenId of tokenIds) {
      const nonce = await this.unique.rpc.system.accountNextIndex(signer.address);

      const txHash = await this.unique.tx.evm
        .call(
          subToEth(signer.address),
          marketContract.options.address,
          marketContract.methods.addAsk(price, '0x0000000000000000000000000000000000000001', collectionContract.options.address, tokenId).encodeABI(),
          0, // value
          2_500_000, // gas
          await this.web3.getGasPrice(),
          null,
          null,
          [],
        )
        .signAndSend(signer, { nonce });

      this.logger.debug(`massFixPriceSale: Add ask for token #${tokenId}: ${txHash.toHuman()}`);
    }

    return {
      statusCode: HttpStatus.OK,
      message: '',
      data: tokenIds,
    };
  }
}
