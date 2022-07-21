import { Injectable, Inject, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { evmToAddress } from '@polkadot/util-crypto';
import { v4 as uuid } from 'uuid';

import { NFTTransfer, AccountPairs } from '../../entity';
import { MarketConfig } from '../../config/market-config';

@Injectable()
export class NFTTransferService {
  private logger = new Logger(NFTTransferService.name);
  constructor(
    @InjectRepository(NFTTransfer)
    private nftTransferRepository?: Repository<NFTTransfer>,
    @InjectRepository(AccountPairs)
    private accountPairsRepository?: Repository<AccountPairs>,
    @Inject('CONFIG') private config?: MarketConfig,
  ) {}

  getNetwork(network?: string): string {
    if (!network) return this.config.blockchain.unique.network;
    return network;
  }

  async registerNftTransfer(
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
        : await this.getSubstrateAddressFromDb(data.addressFrom.Ethereum)
      : data.addressFrom.Substrate;

    const address_to = data.addressTo.Ethereum
      ? isContractTransferTo
        ? evmToAddress(data.addressTo.Ethereum)
        : await this.getSubstrateAddressFromDb(data.addressTo.Ethereum)
      : data.addressTo.Substrate;

    if (!address_from || !address_to || address_from === address_to) return;

    // TODO: change scanBlock -> e.toHuman() -> e.JSON() and refactoring escrow service
    const collection_id = data.collectionId.toString().replace(/,/g, '');
    const token_id = data.tokenId.toString().replace(/,/g, '');

    const item = {
      id: uuid(),
      block_number: `${blockNum}`,
      network: this.getNetwork(network),
      collection_id,
      token_id,
      address_from,
      address_to,
      created_at: new Date(),
      updated_at: new Date(),
    };

    await this.nftTransferRepository.insert({
      ...item,
    });

    this.logger.log(
      JSON.stringify({
        subject: 'Got NFT transfer',
        ...item,
      }),
    );
  }

  async getTokenTransfers(collectionId: number, tokenId: number, network: string) {
    return this.nftTransferRepository.find({
      network: this.getNetwork(network),
      collection_id: collectionId.toString(),
      token_id: tokenId.toString(),
    });
  }

  async getSubstrateAddressFromDb(ethereum: string): Promise<string> {
    return (await this.accountPairsRepository.findOne({ ethereum: ethereum.toLocaleLowerCase() }))?.substrate;
  }
}
