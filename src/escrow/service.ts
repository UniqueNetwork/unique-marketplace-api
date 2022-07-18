import { SearchIndexService } from '../auction/services/search-index.service';
import { ModuleRef } from '@nestjs/core';
import { Injectable, Inject, Logger } from '@nestjs/common';
import { Connection, In, Repository } from 'typeorm';
import { v4 as uuid } from 'uuid';
import { evmToAddress } from '@polkadot/util-crypto';

import * as logging from '../utils/logging';
import { BlockchainBlock, NFTTransfer, ContractAsk, AccountPairs, MoneyTransfer, MarketTrade, SearchIndex, Collection } from '../entity';
import { ASK_STATUS, MONEY_TRANSFER_TYPES, MONEY_TRANSFER_STATUS } from './constants';
import { encodeAddress } from '@polkadot/util-crypto';
import { CollectionStatus } from '../admin/types/collection';
import { MarketConfig } from '../config/market-config';
import { CollectionToken, SellingMethod } from '../types';

@Injectable()
export class EscrowService {
  private readonly collectionsRepository: Repository<Collection>;
  private logger = new Logger(EscrowService.name);

  constructor(
    @Inject('DATABASE_CONNECTION') private db: Connection,
    @Inject('CONFIG') private config: MarketConfig,
    private moduleRef: ModuleRef,
  ) {
    this.collectionsRepository = db.getRepository(Collection);
  }

  getNetwork(network?: string): string {
    if (!network) return this.config.blockchain.unique.network;
    return network;
  }

  async getBlockCreatedAt(blockNum: bigint | number, network?: string, blockTimeSec = 6n): Promise<Date> {
    const repository = this.db.getRepository(BlockchainBlock);
    let block = await repository.findOne({ block_number: `${blockNum}`, network: this.getNetwork(network) });
    if (!!block) return block.created_at;
    block = await repository
      .createQueryBuilder('blockchain_block')
      .orderBy('block_number', 'DESC')
      .where('blockchain_block.network = :network AND blockchain_block.block_number < :num', {
        network: this.getNetwork(network),
        num: blockNum,
      })
      .limit(1)
      .getOne();
    if (!!block) {
      const difference = BigInt(blockNum) - BigInt(block.block_number);
      return new Date(block.created_at.getTime() + Number(difference * 1000n * blockTimeSec)); // predict time for next block
    }
    return new Date();
  }

  async isBlockScanned(blockNum: bigint | number, network?: string): Promise<boolean> {
    return !!(await this.db.getRepository(BlockchainBlock).findOne({ block_number: `${blockNum}`, network: this.getNetwork(network) }))
      ?.block_number;
  }

  async getLastScannedBlock(network?: string) {
    return await this.db
      .getRepository(BlockchainBlock)
      .createQueryBuilder('blockchain_block')
      .orderBy('block_number', 'DESC')
      .where('blockchain_block.network = :network', { network: this.getNetwork(network) })
      .limit(1)
      .getOne();
  }

  async registerAccountPair(substrate: string, ethereum: string) {
    const repository = this.db.getRepository(AccountPairs);
    await repository.upsert({ substrate: substrate, ethereum: ethereum.toLocaleLowerCase() }, ['substrate', 'ethereum']);
  }

  async getSubstrateAddress(ethereum: string): Promise<string> {
    const repository = this.db.getRepository(AccountPairs);
    return (await repository.findOne({ ethereum: ethereum.toLocaleLowerCase() }))?.substrate;
  }

  async getActiveAsk(collectionId: number, tokenId: number, network?: string): Promise<ContractAsk> {
    const repository = this.db.getRepository(ContractAsk);
    return await repository.findOne({
      collection_id: collectionId.toString(),
      token_id: tokenId.toString(),
      network: this.getNetwork(network),
      status: In([ASK_STATUS.ACTIVE, ASK_STATUS.REMOVED_BY_ADMIN]),
    });
  }

  async registerAsk(
    blockNum: bigint | number,
    data: {
      collectionId: number;
      tokenId: number;
      addressFrom: string;
      addressTo: string;
      price: number;
      currency: string;
    },
    network?: string,
  ) {
    const repository = this.db.getRepository(ContractAsk);
    await repository.insert({
      id: uuid(),
      block_number_ask: `${blockNum}`,
      network: this.getNetwork(network),
      collection_id: data.collectionId.toString(),
      token_id: data.tokenId.toString(),
      address_from: encodeAddress(data.addressFrom),
      address_to: data.addressTo,
      status: ASK_STATUS.ACTIVE,
      price: data.price.toString(),
      currency: data.currency,
      created_at_ask: new Date(),
      updated_at: new Date(),
    });
    logging.log(
      `{subject:'Created active offer', thread: 'registerAsk', address: '${
        data.addressFrom
      }', price: ${data.price.toString()}, tokenId: ${data.tokenId.toString()}, collection: ${data.collectionId.toString()}, addressTo: ${
        data.addressTo
      }, block: ${blockNum}, normalAddress: { address: '${encodeAddress(data.addressFrom)}'},  log: 'registerAsk' }`,
    );
    this.logger.log(
      `{subject:'Created active offer', thread: 'registerAsk', address: '${
        data.addressFrom
      }', price: ${data.price.toString()}, tokenId: ${data.tokenId.toString()}, collection: ${data.collectionId.toString()}, addressTo: ${
        data.addressTo
      }, block: ${blockNum}, normalAddress: { address: ${encodeAddress(data.addressFrom)}'},  log: 'registerAsk' }`,
    );
  }

  async cancelAsk(collectionId: number, tokenId: number, blockNumber: bigint, network?: string) {
    const repository = this.db.getRepository(ContractAsk);
    await repository.update(
      {
        collection_id: collectionId.toString(),
        token_id: tokenId.toString(),
        status: In([ASK_STATUS.ACTIVE, ASK_STATUS.REMOVED_BY_ADMIN]),
        network: this.getNetwork(network),
      },
      { status: ASK_STATUS.CANCELLED, block_number_cancel: `${blockNumber}` },
    );
    logging.log(
      `{subject: 'Canceled offer', status: 'CANCELLED', block:${blockNumber}, collection: ${collectionId.toString()}, token: ${tokenId.toString()}, network: '${this.getNetwork(
        network,
      )}', log: 'cancelAsk' }`,
    );
    this.logger.log(
      `{subject: 'Canceled offer', status: 'CANCELLED', block:${blockNumber}, collection: ${collectionId.toString()}, token: ${tokenId.toString()}, network: '${this.getNetwork(
        network,
      )}', log: 'cancelAsk' }`,
    );
  }

  async buyKSM(collectionId: number, tokenId: number, blockNumber: bigint, network?: string) {
    const repository = this.db.getRepository(ContractAsk);
    await repository.update(
      {
        collection_id: collectionId.toString(),
        token_id: tokenId.toString(),
        status: ASK_STATUS.ACTIVE,
        network: this.getNetwork(network),
      },
      { status: ASK_STATUS.BOUGHT, block_number_buy: `${blockNumber}` },
    );
    logging.log(
      `{subject:'Got buyKSM', thread:'offer update', collection: ${collectionId.toString()}, token: ${tokenId.toString()}, network:'${this.getNetwork(
        network,
      )}', status: 'ACTIVE', log:'buyKSM' }`,
    );
    this.logger.log(
      `{subject:'Got buyKSM', thread:'offer update', collection: ${collectionId.toString()}, token: ${tokenId.toString()}, network: '${this.getNetwork(
        network,
      )}', status: 'ACTIVE', log:'buyKSM' }`,
    );
  }

  async registerTransfer(
    blockNum: bigint | number,
    data: {
      collectionId: number;
      tokenId: number;
      addressFrom: { Ethereum?: string; Substrate?: string };
      addressTo: { Ethereum?: string; Substrate?: string };
    },
    network?: string,
  ) {
    const { contractAddress } = this.config.blockchain.unique;

    const isContractTransferFrom = data.addressFrom.Ethereum?.toLowerCase() === contractAddress.toLowerCase();
    const isContractTransferTo = data.addressTo.Ethereum?.toLowerCase() === contractAddress.toLowerCase();

    const address_from = data.addressFrom.Ethereum
      ? isContractTransferFrom
        ? evmToAddress(data.addressFrom.Ethereum)
        : await this.getSubstrateAddress(data.addressFrom.Ethereum)
      : data.addressFrom.Substrate;

    const address_to = data.addressTo.Ethereum
      ? isContractTransferTo
        ? evmToAddress(data.addressTo.Ethereum)
        : await this.getSubstrateAddress(data.addressTo.Ethereum)
      : data.addressTo.Substrate;

    if (!address_from || !address_to) return;

    const repository = this.db.getRepository(NFTTransfer);

    // TODO: find out why such parameters are from the chain
    const collection_id = data.collectionId.toString().replace(/,/g, '');
    const token_id = data.tokenId.toString().replace(/,/g, '');

    await repository.insert({
      id: uuid(),
      block_number: `${blockNum}`,
      network: this.getNetwork(network),
      collection_id,
      token_id,
      address_from,
      address_to,
      created_at: new Date(),
      updated_at: new Date(),
    });
    logging.log(
      `{subject:'Got NFT transfer', thread:'NFTTransfer', token: ${token_id}, collection: ${collection_id}, addressFrom: '${data.addressFrom}', addressTo: ${data.addressTo}, block: #${blockNum}, log: 'registerTransfer'}`,
    );
    this.logger.log(
      `{subject:'Got NFT transfer', thread:'NFTTransfer', token: ${token_id}, collection: ${collection_id}, addressFrom: '${data.addressFrom}', addressTo: ${data.addressTo}, block: #${blockNum}, log: 'registerTransfer'}`,
    );
  }

  async getTokenTransfers(collectionId: number, tokenId: number, network: string) {
    const repository = this.db.getRepository(NFTTransfer);
    return repository.find({
      network: this.getNetwork(network),
      collection_id: collectionId.toString(),
      token_id: tokenId.toString(),
    });
  }

  async addBlock(blockNum: bigint | number, timestamp: number, network?: string) {
    const repository = this.db.getRepository(BlockchainBlock);
    const created_at = new Date(timestamp);
    await repository.upsert({ block_number: `${blockNum}`, network: this.getNetwork(network), created_at }, ['block_number', 'network']);
  }

  async modifyContractBalance(amount, address, blockNumber, network: string): Promise<MoneyTransfer> {
    const repository = this.db.getRepository(MoneyTransfer);
    const transfer = repository.create({
      id: uuid(),
      amount,
      block_number: blockNumber,
      network,
      type: MONEY_TRANSFER_TYPES.DEPOSIT,
      status: MONEY_TRANSFER_STATUS.PENDING,
      created_at: new Date(),
      updated_at: new Date(),
      extra: { address },
      currency: '2', // TODO: check this
    });
    await repository.save(transfer);
    logging.log(
      `{subject:'Unique deposit for money transfer', amount: ${amount}, address: '${address}', address_normal: '${encodeAddress(
        address,
      )}', status: 'PENDING',  block: ${blockNumber}, log: 'modifyContractBalance' }`,
    );
    this.logger.log(
      `{subject:'Unique deposit for money transfer', amount: ${amount}, address: '${address}', address_normal: '${encodeAddress(
        address,
      )}', status: 'PENDING',  block: ${blockNumber}, log: 'modifyContractBalance' }`,
    );
    return transfer;
  }

  async registerKusamaWithdraw(amount, address, blockNumber, network) {
    const repository = this.db.getRepository(MoneyTransfer);
    await repository.insert({
      id: uuid(),
      amount,
      block_number: blockNumber,
      network,
      type: MONEY_TRANSFER_TYPES.WITHDRAW,
      status: MONEY_TRANSFER_STATUS.PENDING,
      created_at: new Date(),
      updated_at: new Date(),
      extra: { address },
      currency: '2', // TODO: check this
    });
    logging.log(
      `{ subject:'Transfer money Kusama', thread: 'withdraw', amount: ${amount},  address: '${address}', address_normal: '${encodeAddress(
        address,
      )}', status: 'PENDING',   block: ${blockNumber} , log: 'registerKusamaWithdraw'}`,
    );
    this.logger.log(
      `{ subject:'Transfer money Kusama', thread: 'withdraw', amount: ${amount}, address: '${address}', address_normal: '${encodeAddress(
        address,
      )}', status: 'PENDING', block: ${blockNumber} , log: 'registerKusamaWithdraw'}`,
    );
  }

  async getPendingContractBalance(network: string) {
    return this.db
      .getRepository(MoneyTransfer)
      .createQueryBuilder('money_transfer')
      .orderBy('created_at', 'ASC')
      .where('(money_transfer.network = :network AND money_transfer.type = :type AND money_transfer.status = :status)', {
        network,
        type: MONEY_TRANSFER_TYPES.DEPOSIT,
        status: MONEY_TRANSFER_STATUS.PENDING,
      })
      .limit(1)
      .getOne();
  }

  async getPendingKusamaWithdraw(network: string) {
    return this.db
      .getRepository(MoneyTransfer)
      .createQueryBuilder('money_transfer')
      .orderBy('created_at', 'ASC')
      .where('(money_transfer.network = :network AND money_transfer.type = :type AND money_transfer.status = :status)', {
        network,
        type: MONEY_TRANSFER_TYPES.WITHDRAW,
        status: MONEY_TRANSFER_STATUS.PENDING,
      })
      .limit(1)
      .getOne();
  }

  async updateMoneyTransferStatus(id, status: string) {
    await this.db.getRepository(MoneyTransfer).update({ id }, { status, updated_at: new Date() });
    this.logger.log(`Transfer status update ${status} in ${id}`);
  }

  async getTradeSellerAndBuyer(buyer: string, seller: string, price: string): Promise<MarketTrade> {
    const repository = this.db.getRepository(MarketTrade);
    return await repository.findOne({
      address_seller: seller,
      address_buyer: buyer,
      price: price,
    });
  }

  async registerTrade(buyer: string, price: bigint, ask: ContractAsk, blockNum: bigint, originPrice: bigint, network?: string) {
    const repository = this.db.getRepository(MarketTrade);
    await repository.insert({
      id: uuid(),
      collection_id: ask.collection_id,
      token_id: ask.token_id,
      network: this.getNetwork(network),
      price: `${price}`,
      currency: ask.currency,
      address_seller: encodeAddress(ask.address_from),
      address_buyer: encodeAddress(buyer),
      block_number_ask: ask.block_number_ask,
      block_number_buy: `${blockNum}`,
      ask_created_at: await this.getBlockCreatedAt(BigInt(ask.block_number_ask), network),
      buy_created_at: await this.getBlockCreatedAt(blockNum, network),
      status: SellingMethod.FixedPrice,
      originPrice: `${originPrice}`,
      commission: `${originPrice - price}`,
    });
    logging.log(
      `{ subject: 'Register market trade', thread:'trades', collection: ${ask.collection_id}, token:${
        ask.token_id
      }, price: ${price}, block: ${blockNum}, address_seller: '${
        ask.address_from
      }', address_buyer: ${buyer}, normal:{address_seller: '${encodeAddress(ask.address_from)}', address_buyer: '${encodeAddress(
        buyer,
      )}' },  log: 'registerTrade' }`,
    );
    this.logger.log(
      `{ subject: 'Register market trade', thread:'trades', collection: ${ask.collection_id}, token:${
        ask.token_id
      }, price: ${price}, block: ${blockNum}, address_seller: '${
        ask.address_from
      }', address_buyer: ${buyer}, normal:{address_seller: '${encodeAddress(ask.address_from)}', address_buyer: '${encodeAddress(
        buyer,
      )}' },  log: 'registerTrade' }`,
    );
    await this.buyKSM(parseInt(ask.collection_id), parseInt(ask.token_id), blockNum, network);
  }

  async getSearchIndexTraits(collectionId: number, tokenId: number, network?: string) {
    const repository = this.db.getRepository(SearchIndex);
    return await repository.find({
      collection_id: collectionId.toString(),
      token_id: tokenId.toString(),
      network: this.getNetwork(network),
      is_trait: true,
    });
  }

  async addSearchIndexes(token: CollectionToken): Promise<void> {
    const searchIndex = this.moduleRef.get(SearchIndexService, { strict: false });
    return searchIndex.addSearchIndexIfNotExists(token);
  }

  /**
   * Get enabled collections ids from database
   * @return ({Promise<number[]>})
   */
  async getCollectionIds(): Promise<number[]> {
    const collections = await this.collectionsRepository.find({ status: CollectionStatus.Enabled });

    return collections.map((i) => Number(i.id));
  }

  async setCollectionIds(id: string, data: any) {
    const entity = this.collectionsRepository.create({ id: id, ...data });
    await this.collectionsRepository.save(entity);
    logging.log(`Adding #${id} to collection table`);
  }
}
