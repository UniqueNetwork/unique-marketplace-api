import { Injectable, Inject } from '@nestjs/common';
import { Connection } from 'typeorm';
import { v4 as uuid } from 'uuid';
import { decodeAddress } from "@polkadot/util-crypto";

import { BlockchainBlock, NFTTransfer, ContractAsk, AccountPairs, MoneyTransfer, MarketTrade, SearchIndex } from '../entity/evm';
import { Offer, Trade, TokenTextSearch } from '../entity';
import { ASK_STATUS, MONEY_TRANSFER_TYPES, MONEY_TRANSFER_STATUS } from './constants';


const oldOfferStatus = {
  ACTIVE: 1,
  CANCELED: 2,
  TRADED: 3
}

@Injectable()
export class EscrowService {
  constructor(
    @Inject('DATABASE_CONNECTION') private db: Connection,
    @Inject('CONFIG') private config
  ) {}

  getNetwork(network?: string): string {
    if(!network) return this.config.blockchain.unique.network;
    return network;
  }

  async getBlockCreatedAt(blockNum: bigint | number, network?: string, blockTimeSec: bigint = 6n): Promise<Date> {
    const repository = this.db.getRepository(BlockchainBlock)
    let block = await repository.findOne({block_number: `${blockNum}`, network: this.getNetwork(network)});
    if(!!block) return block.created_at;
    block = await repository.createQueryBuilder("blockchain_block").orderBy("block_number", "DESC").where("blockchain_block.network = :network AND blockchain_block.block_number < :num", {network: this.getNetwork(network), num: blockNum}).limit(1).getOne();
    if(!!block) {
      let difference = BigInt(blockNum) - BigInt(block.block_number);
      return new Date(block.created_at.getTime() + Number(difference * 1000n * blockTimeSec));  // predict time for next block
    }
    return new Date();
  }

  async isBlockScanned(blockNum: bigint | number, network?: string): Promise<boolean> {
    return !!((await this.db.getRepository(BlockchainBlock).findOne({block_number: `${blockNum}`, network: this.getNetwork(network)}))?.block_number);
  }

  async getLastScannedBlock(network?: string) {
    return await this.db.getRepository(BlockchainBlock).createQueryBuilder("blockchain_block").orderBy("block_number", "DESC").where("blockchain_block.network = :network", {network: this.getNetwork(network)}).limit(1).getOne();
  }

  async registerAccountPair(substrate: string, ethereum: string) {
    const repository = this.db.getRepository(AccountPairs);
    await repository.upsert({substrate: substrate, ethereum: ethereum.toLocaleLowerCase()}, ['substrate', 'ethereum']);
  }

  async getSubstrateAddress(ethereum: string): Promise<string> {
    const repository = this.db.getRepository(AccountPairs);
    return (await repository.findOne({ethereum: ethereum.toLocaleLowerCase()}))?.substrate;
  }

  async getActiveAsk(collectionId: number, tokenId: number, network?: string): Promise<ContractAsk> {
    const repository = this.db.getRepository(ContractAsk);
    return await repository.findOne({collection_id: collectionId.toString(), token_id: tokenId.toString(), network: this.getNetwork(network)});
  }

  async registerAsk(blockNum: bigint | number, data: {collectionId: number, tokenId: number, addressFrom: string, addressTo: string, price: number, currency: string}, network?: string) {
    const repository = this.db.getRepository(ContractAsk);
    await repository.insert({
      id: uuid(),
      block_number_ask: `${blockNum}`, network: this.getNetwork(network), collection_id: data.collectionId.toString(), token_id: data.tokenId.toString(),
      address_from: data.addressFrom, address_to: data.addressTo, status: ASK_STATUS.ACTIVE, price: data.price.toString(), currency: data.currency
    });
  }

  async cancelAsk(collectionId: number, tokenId: number, blockNumber: bigint, network?: string) {
    const repository = this.db.getRepository(ContractAsk);
    await repository.update({collection_id: collectionId.toString(), token_id: tokenId.toString(), status: ASK_STATUS.ACTIVE, network: this.getNetwork(network)}, {status: ASK_STATUS.CANCELLED, block_number_cancel: `${blockNumber}`});
  }

  async buyKSM(collectionId: number, tokenId: number, blockNumber: bigint, network?: string) {
    const repository = this.db.getRepository(ContractAsk);
    await repository.update({collection_id: collectionId.toString(), token_id: tokenId.toString(), status: ASK_STATUS.ACTIVE, network: this.getNetwork(network)}, {status: ASK_STATUS.BOUGHT, block_number_buy: `${blockNumber}`});
  }

  async registerTransfer(blockNum: bigint | number, data: {collectionId: number, tokenId: number, addressFrom: string, addressTo: string}, network?: string) {
    const repository = this.db.getRepository(NFTTransfer);
    await repository.insert({
      id: uuid(),
      block_number: `${blockNum}`, network: this.getNetwork(network), collection_id: data.collectionId.toString(), token_id: data.tokenId.toString(),
      address_from: data.addressFrom, address_to: data.addressTo
    });
  }

  async addBlock(blockNum: bigint | number, timestamp: number, network?: string) {
    const repository = this.db.getRepository(BlockchainBlock);
    const created_at = new Date(timestamp);
    await repository.upsert({block_number: `${blockNum}`, network: this.getNetwork(network), created_at}, ["block_number", "network"]);
  }

  async registerKusamaDeposit(amount, address, blockNumber, network: string) {
    const repository = this.db.getRepository(MoneyTransfer);
    await repository.insert({
      id: uuid(), amount, block_number: blockNumber, network, type: MONEY_TRANSFER_TYPES.DEPOSIT,
      status: MONEY_TRANSFER_STATUS.PENDING, created_at: new Date(), updated_at: new Date(), extra: {address},
      currency: "2" // TODO: check this
    });
  }

  async registerKusamaWithdraw(amount, address, blockNumber, network) {
    const repository = this.db.getRepository(MoneyTransfer);
    await repository.insert({
      id: uuid(), amount, block_number: blockNumber, network, type: MONEY_TRANSFER_TYPES.WITHDRAW,
      status: MONEY_TRANSFER_STATUS.PENDING, created_at: new Date(), updated_at: new Date(), extra: {address},
      currency: "2" // TODO: check this
    })
  }

  async getPendingKusamaDeposit(network: string) {
    return this.db.getRepository(MoneyTransfer).createQueryBuilder("money_transfer").orderBy("created_at", "ASC").where(
      "(money_transfer.network = :network AND money_transfer.type = :type AND money_transfer.status = :status)",
      {network, type: MONEY_TRANSFER_TYPES.DEPOSIT, status: MONEY_TRANSFER_STATUS.PENDING}
    ).limit(1).getOne();
  }

  async getPendingKusamaWithdraw(network: string) {
    return this.db.getRepository(MoneyTransfer).createQueryBuilder("money_transfer").orderBy("created_at", "ASC").where(
      "(money_transfer.network = :network AND money_transfer.type = :type AND money_transfer.status = :status)",
      {network, type: MONEY_TRANSFER_TYPES.WITHDRAW, status: MONEY_TRANSFER_STATUS.PENDING}
    ).limit(1).getOne();
  }

  async updateMoneyTransferStatus(id, status: string) {
    await this.db.getRepository(MoneyTransfer).update({id}, {status, updated_at: new Date()});
  }

  async registerTrade(buyer: string, price: bigint, ask: ContractAsk, blockNum: bigint, network?: string) {
    const repository = this.db.getRepository(MarketTrade);

    await repository.insert({
      collection_id: ask.collection_id, token_id: ask.token_id, network: this.getNetwork(network), price: `${price}`,
      currency: ask.currency, address_seller: ask.address_from, address_buyer: buyer, block_number_ask: ask.block_number_ask,
      block_number_buy: `${blockNum}`, ask_created_at: await this.getBlockCreatedAt(BigInt(ask.block_number_ask), network),
      buy_created_at: await this.getBlockCreatedAt(blockNum, network)
    });
    await this.buyKSM(parseInt(ask.collection_id), parseInt(ask.token_id), blockNum, network);
  }

  async addSearchIndexes(keywords, collectionId: number, tokenId: number, network?: string) {
    const repository = this.db.getRepository(SearchIndex);
    network = this.getNetwork(network);
    const alreadyExist = await repository.count({collection_id: collectionId.toString(), token_id: tokenId.toString(), network});
    if(alreadyExist > 0) return;
    await repository.insert(keywords.map(x => {
      return {id: uuid(), collection_id: collectionId.toString(), token_id: tokenId.toString(), network, locale: x.locale, text: x.text}
    }));
  }

  async oldGetActiveOffer(collectionId: number, tokenId: number) {
    const repository = this.db.getRepository(Offer);
    return await repository.findOne({
      collectionId: collectionId.toString(), tokenId: tokenId.toString(), offerStatus: oldOfferStatus.ACTIVE
    });
  }

  async oldCancelOffers(collectionId: number, tokenId: number) {
    const repository = this.db.getRepository(Offer);
    await repository.update({collectionId: collectionId.toString(), tokenId: tokenId.toString(), offerStatus: oldOfferStatus.ACTIVE}, {offerStatus: oldOfferStatus.CANCELED});
  }

  async oldRegisterOffer(data: {collectionId: number, tokenId: number, seller: string, price: bigint}) {
    await this.oldCancelOffers(data.collectionId, data.tokenId);

    const repository = this.db.getRepository(Offer);
    await repository.insert({
      id: uuid(), creationDate: new Date(), collectionId: data.collectionId.toString(), tokenId: data.tokenId.toString(),
      price: data.price, sellerPublicKeyBytes: decodeAddress(data.seller), metadata: {}, seller: data.seller, offerStatus: oldOfferStatus.ACTIVE, quoteId: "2"
    });
  }

  async oldRegisterTrade(buyer, offer: Offer, price: bigint) {
    const repository = this.db.getRepository(Trade);

    await repository.insert({id: uuid(), tradeDate: new Date(), buyer, offerId: offer.id, price});
    await this.db.getRepository(Offer).update({id: offer.id}, {offerStatus: oldOfferStatus.TRADED});
  }

  async oldAddSearchIndexes(keywords, data: {collectionId: number, tokenId: number}) {
    const repository = this.db.getRepository(TokenTextSearch);
    const alreadyExist = await repository.count({collectionId: data.collectionId.toString(), tokenId: data.tokenId.toString()})
    if(alreadyExist > 0) return;
    await repository.insert(keywords.map(x => {
      return {id: uuid(), collectionId: data.collectionId.toString(), tokenId: data.tokenId.toString(), locale: x.locale, text: x.text}
    }));
  }
}