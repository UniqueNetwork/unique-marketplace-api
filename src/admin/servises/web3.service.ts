import { Injectable, Inject } from '@nestjs/common';
import { MarketConfig } from '../../config/market-config';

import * as Web3_ from 'web3';
import { collectionIdToAddress } from '../../utils/blockchain/web3';
import { blockchainStaticFile } from '../../utils/blockchain/util';
const Web3 = Web3_ as any;

const CollectionABI = JSON.parse(blockchainStaticFile('nonFungibleAbi.json'));
const MarketABI = JSON.parse(blockchainStaticFile('MarketPlace.json')).abi;

@Injectable()
export class Web3Service {
  private readonly web3;

  constructor(@Inject('CONFIG') private config: MarketConfig) {
    const { wsEndpoint } = config.blockchain.unique;

    const ethProvider = new Web3.providers.WebsocketProvider(wsEndpoint, {
      reconnect: { auto: true, maxAttempts: 5, delay: 1000 },
    });

    this.web3 = new Web3(ethProvider);
  }

  getCollectionContract(collectionId: number) {
    return new this.web3.eth.Contract(CollectionABI, collectionIdToAddress(collectionId));
  }

  getMarketContract(contractAddress: string) {
    return new this.web3.eth.Contract(MarketABI, contractAddress);
  }

  async getGasPrice() {
    return await this.web3.eth.getGasPrice();
  }
}
