import { SearchIndexService } from "../auction/services/search-index.service";
import { ModuleRef } from '@nestjs/core';
import { Injectable, Inject, Logger } from "@nestjs/common";
import { Connection } from 'typeorm';
import { v4 as uuid } from 'uuid';
import * as logging from '../utils/logging';

import { BlockchainBlock, NFTTransfer, ContractAsk, AccountPairs, MoneyTransfer, MarketTrade, SearchIndex } from '../entity';
import { ASK_STATUS, MONEY_TRANSFER_TYPES, MONEY_TRANSFER_STATUS } from './constants';
import { encodeAddress } from '@polkadot/util-crypto';
import { CollectionToken } from "../auction/types";

@Injectable()
export class EscrowService {
  private logger = new Logger(EscrowService.name)
  constructor(
    @Inject('DATABASE_CONNECTION') private db: Connection,
    @Inject('CONFIG') private config,
    private moduleRef: ModuleRef
    ) {}

  getNetwork(network?: string): string {
    if (!network) return this.config.blockchain.unique.network;
    return network;
  }

  async getBlockCreatedAt(blockNum: bigint | number, network?: string, blockTimeSec: bigint = 6n): Promise<Date> {
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
      let difference = BigInt(blockNum) - BigInt(block.block_number);
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
      status: ASK_STATUS.ACTIVE,
    });
  }

  async registerAsk(
    blockNum: bigint | number,
    data: { collectionId: number; tokenId: number; addressFrom: string; addressTo: string; price: number; currency: string },
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
      updated_at: new Date()
    });
    logging.log(`{subject:'Created active offer', thread: 'registerAsk', address: '${data.addressFrom}', price: ${data.price.toString()}, tokenId: ${data.tokenId.toString()}, collection: ${data.collectionId.toString()}, addressTo: ${data.addressTo}, block: ${blockNum}, normalAddress: { address: '${encodeAddress(data.addressFrom)}'},  log: 'registerAsk' }`);
    this.logger.log(`{subject:'Created active offer', thread: 'registerAsk', address: '${data.addressFrom}', price: ${data.price.toString()}, tokenId: ${data.tokenId.toString()}, collection: ${data.collectionId.toString()}, addressTo: ${data.addressTo}, block: ${blockNum}, normalAddress: { address: ${encodeAddress(data.addressFrom)}'},  log: 'registerAsk' }`);
  }

  async cancelAsk(collectionId: number, tokenId: number, blockNumber: bigint, network?: string) {
    const repository = this.db.getRepository(ContractAsk);
    await repository.update(
      {
        collection_id: collectionId.toString(),
        token_id: tokenId.toString(),
        status: ASK_STATUS.ACTIVE,
        network: this.getNetwork(network),
      },
      { status: ASK_STATUS.CANCELLED, block_number_cancel: `${blockNumber}` },
    );
    logging.log(`{subject: 'Canceled offer', status: 'CANCELLED', block:${blockNumber}, collection: ${collectionId.toString()}, token: ${tokenId.toString()}, network: '${this.getNetwork(network)}', log: 'cancelAsk' }`)
    this.logger.log(`{subject: 'Canceled offer', status: 'CANCELLED', block:${blockNumber}, collection: ${collectionId.toString()}, token: ${tokenId.toString()}, network: '${this.getNetwork(network)}', log: 'cancelAsk' }`)
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
    logging.log(`{subject:'Got buyKSM', thread:'offer update', collection: ${collectionId.toString()}, token: ${tokenId.toString()}, network:'${this.getNetwork(network)}', status: 'ACTIVE', log:'buyKSM' }`)
    this.logger.log(`{subject:'Got buyKSM', thread:'offer update', collection: ${collectionId.toString()}, token: ${tokenId.toString()}, network: '${this.getNetwork(network)}', status: 'ACTIVE', log:'buyKSM' }`)
  }

  async registerTransfer(
    blockNum: bigint | number,
    data: { collectionId: number; tokenId: number; addressFrom: string; addressTo: string },
    network?: string,
  ) {
    const repository = this.db.getRepository(NFTTransfer);
    await repository.insert({
      id: uuid(),
      block_number: `${blockNum}`,
      network: this.getNetwork(network),
      collection_id: data.collectionId.toString(),
      token_id: data.tokenId.toString(),
      address_from: data.addressFrom,
      address_to: data.addressTo,
      created_at: new Date(),
      updated_at: new Date(),
    });
    logging.log(`{subject:'Got NFT transfer', thread:'NFTTransfer', token: ${data.tokenId.toString()}, collection: ${data.collectionId.toString()}, addressFrom: '${data.addressFrom}', addressFromNorm:  '${encodeAddress(data.addressFrom)}', addressTo: ${data.addressTo}, block: #${blockNum}, log: 'registerTransfer'}`)
    this.logger.log(`{subject:'Got NFT transfer', thread:'NFTTransfer', token: ${data.tokenId.toString()}, collection: ${data.collectionId.toString()}, addressFrom: '${data.addressFrom}', addressFromNorm:  '${encodeAddress(data.addressFrom)}', addressTo: ${data.addressTo}, block: #${blockNum}, log: 'registerTransfer'}` )
  }

  async getTokenTransfers(collectionId: number, tokenId: number, network: string) {
    const repository = this.db.getRepository(NFTTransfer);
    return repository.find({ network: this.getNetwork(network), collection_id: collectionId.toString(), token_id: tokenId.toString() });
  }

  async addBlock(blockNum: bigint | number, timestamp: number, network?: string) {
    const repository = this.db.getRepository(BlockchainBlock);
    const created_at = new Date(timestamp);
    await repository.upsert({ block_number: `${blockNum}`, network: this.getNetwork(network), created_at }, ['block_number', 'network']);
  }

  async modifyContractBalance(amount, address, blockNumber, network: string): Promise<MoneyTransfer> {
    const repository = this.db.getRepository(MoneyTransfer);
    let transfer = repository.create({
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
    logging.log(`{subject:'Unique deposit for money transfer', amount: ${amount}, address: '${address}', address_normal: '${encodeAddress(address)}', status: 'PENDING',  block: ${blockNumber}, log: 'modifyContractBalance' }`)
    this.logger.log(`{subject:'Unique deposit for money transfer', amount: ${amount}, address: '${address}', address_normal: '${encodeAddress(address)}', status: 'PENDING',  block: ${blockNumber}, log: 'modifyContractBalance' }`)
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
    logging.log(`{ subject:'Transfer money Kusama', thread: 'withdraw', amount: ${amount},  address: '${address}', address_normal: '${encodeAddress(address)}', status: 'PENDING',   block: ${blockNumber} , log: 'registerKusamaWithdraw'}`)
    this.logger.log(`{ subject:'Transfer money Kusama', thread: 'withdraw', amount: ${amount}, address: '${address}', address_normal: '${encodeAddress(address)}', status: 'PENDING', block: ${blockNumber} , log: 'registerKusamaWithdraw'}`)
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
    this.logger.log(`Transfer status update ${status} in ${id}`)
  }

  async getTradeSellerAndBuyer(buyer: string, seller: string, price: string): Promise<MarketTrade> {
    const repository = this.db.getRepository(MarketTrade);
    return await repository.findOne({
      address_seller: seller,
      address_buyer: buyer,
      price: price,
    });
  }

  async registerTrade(buyer: string, price: bigint, ask: ContractAsk, blockNum: bigint, network?: string) {
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
    });
    logging.log(`{ subject: 'Register market trade', thread:'trades', collection: ${ask.collection_id}, token:${ask.token_id}, price: ${price}, block: ${blockNum}, address_seller: '${ask.address_from}', address_buyer: ${buyer}, normal:{address_seller: '${encodeAddress(ask.address_from)}', address_buyer: '${encodeAddress(buyer)}' },  log: 'registerTrade' }`)
    this.logger.log(`{ subject: 'Register market trade', thread:'trades', collection: ${ask.collection_id}, token:${ask.token_id}, price: ${price}, block: ${blockNum}, address_seller: '${ask.address_from}', address_buyer: ${buyer}, normal:{address_seller: '${encodeAddress(ask.address_from)}', address_buyer: '${encodeAddress(buyer)}' },  log: 'registerTrade' }`)
    await this.buyKSM(parseInt(ask.collection_id), parseInt(ask.token_id), blockNum, network);
  }

  async getSearchIndexTraits( collectionId: number, tokenId: number, network?: string){
    const repository = this.db.getRepository(SearchIndex);
    return await repository.find({ collection_id: collectionId.toString(), token_id: tokenId.toString(), network: this.getNetwork(network) , is_trait: true })
  }

  async addSearchIndexes(token:CollectionToken): Promise<void> {
    const searchIndex = this.moduleRef.get(SearchIndexService, { strict: false });
    return searchIndex.addSearchIndexIfNotExists(token);
  }
}
