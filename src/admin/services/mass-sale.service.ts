import '@polkadot/api-augment/polkadot';
import { Injectable, BadRequestException, Inject, HttpStatus, Logger } from '@nestjs/common';
import { BN } from '@polkadot/util';
import { BnList } from '@polkadot/util/types';
import { Keyring } from '@polkadot/api';
import { Observable, Subscriber } from 'rxjs';
import { Connection, Repository } from 'typeorm';
import { Interface } from 'ethers/lib/utils';

import { MassFixPriceSaleDTO, MassFixPriceSaleResult, MassAuctionSaleDTO, MassAuctionSaleResult } from '../dto';
import { CollectionsService } from './collections.service';
import { MarketConfig } from '../../config/market-config';
import { collectionIdToAddress, subToEth } from '../../utils/blockchain/web3';
import { BlockchainBlock } from '../../entity/blockchain-block';
import { DateHelper } from '../../utils/date-helper';
import { AuctionCreationService } from '../../auction/services/auction-creation.service';
import { PrepareMassSaleResult, TransferResult } from '../types';
import { blockchainStaticFile } from '../../utils/blockchain/util';
import { GAS_LIMIT } from '../constants';
import { ProxyCollection } from '../../utils/blockchain';
import { InjectUniqueAPI } from '../../blockchain';

@Injectable()
export class MassSaleService {
  private readonly logger: Logger;
  private readonly blockchainBlockRepository: Repository<BlockchainBlock>;
  private readonly collectionContractInterface: Interface;
  private readonly marketContractInterface: Interface;

  constructor(
    @Inject('DATABASE_CONNECTION') private connection: Connection,
    @InjectUniqueAPI() private unique,
    @Inject('CONFIG') private config: MarketConfig,
    private readonly collections: CollectionsService,
    private readonly auctionCreationService: AuctionCreationService,
  ) {
    this.logger = new Logger(MassSaleService.name);
    this.blockchainBlockRepository = connection.getRepository(BlockchainBlock);

    const CollectionABI = JSON.parse(blockchainStaticFile('nonFungibleAbi.json'));
    const MarketABI = JSON.parse(blockchainStaticFile('MarketPlace.json')).abi;

    this.collectionContractInterface = new Interface(CollectionABI);
    this.marketContractInterface = new Interface(MarketABI);
  }

  /**
   * Mass fix price sale
   * @param {MassFixPriceSaleDTO} data - mass fix price sale params
   * @return ({Promise<MassFixPriceSaleResult>})
   */
  async massFixPriceSale(data: MassFixPriceSaleDTO): Promise<MassFixPriceSaleResult> {
    const { collectionId, price } = data;
    const { signer, tokenIds } = await this.prepareMassSale(collectionId);

    const tokensCount = tokenIds.length;

    if (tokensCount === 0) throw new BadRequestException('No tokens for sale');

    const collectionContractAddress = collectionIdToAddress(collectionId);
    const marketContractAddress = this.config.blockchain.unique.contractAddress;
    if (!marketContractAddress) throw new BadRequestException('Market contract address not set');

    for (const tokenId of tokenIds) {
      const transferTxHash = await this.unique.tx.unique
        .transfer({ Ethereum: subToEth(signer.address) }, collectionId, tokenId, 1)
        .signAndSend(signer, { nonce: -1 });

      this.logger.debug(`massFixPriceSale: Token #${tokenId} transfer: ${transferTxHash.toHuman()}`);

      const approveTxHash = await this.unique.tx.evm
        .call(
          subToEth(signer.address),
          collectionContractAddress,
          this.collectionContractInterface.encodeFunctionData('approve', [marketContractAddress, tokenId]),
          0,
          GAS_LIMIT,
          await this.getGasPrice(),
          null,
          null,
          [],
        )
        .signAndSend(signer, { nonce: -1 });

      this.logger.debug(`massFixPriceSale: Token #${tokenId} approve: ${approveTxHash.toHuman()}`);

      const askTxHash = await this.unique.tx.evm
        .call(
          subToEth(signer.address),
          marketContractAddress,
          this.marketContractInterface.encodeFunctionData('addAsk', [price, '0x0000000000000000000000000000000000000001', collectionContractAddress, tokenId]),
          0,
          GAS_LIMIT,
          await this.getGasPrice(),
          null,
          null,
          [],
        )
        .signAndSend(signer, { nonce: -1 });

      this.logger.debug(`massFixPriceSale: Token #${tokenId} add ask: ${askTxHash.toHuman()}`);
    }

    const message = `${tokensCount} tokens successfully offered for fix price sale`;

    return {
      statusCode: HttpStatus.OK,
      message,
      data: tokenIds,
    };
  }

  /**
   * Mass auction sale
   * @param {MassAuctionSaleDTO} data - mass auction sale params
   * @return ({Promise<MassAuctionSaleResult>})
   */
  async massAuctionSale(data: MassAuctionSaleDTO): Promise<MassAuctionSaleResult> {
    const { collectionId, startPrice, priceStep, days, minutes } = data;
    const { signer, tokenIds } = await this.prepareMassSale(collectionId);

    const tokensCount = tokenIds.length;

    if (tokensCount === 0) throw new BadRequestException('No tokens for sale');

    let stopAt = DateHelper.addDays(days);
    if (minutes) stopAt = DateHelper.addMinutes(minutes, stopAt);

    const auctionSeed = this.config.auction.seed;
    if (!auctionSeed) throw new BadRequestException('Auction seed not set');

    const keyring = new Keyring({ type: 'sr25519' });
    const { address: auctionAddress } = keyring.addFromUri(auctionSeed);

    const ownerAddress = signer.address;

    const transfers: TransferResult[] = await new Promise(async (resolve) => {
      if (tokenIds.length === 0) resolve([]);

      let i = 0;
      let subscriber: Subscriber<unknown>;
      const result = [];
      new Observable((s) => (subscriber = s)).subscribe((transfer) => {
        result.push(transfer);

        if (++i === tokenIds.length) resolve(result);
      });

      for (const tokenId of tokenIds) {
        await this.unique.tx.unique.transfer({ Substrate: auctionAddress }, collectionId, tokenId, 1).signAndSend(signer, { nonce: -1 }, async ({ status }) => {
          if (status.isFinalized) {
            const blockHash = status.asFinalized;

            const block = await this.unique.rpc.chain.getBlock(blockHash);

            const blockNumber = block.block.header.number.toBigInt();

            subscriber.next({ tokenId, blockNumber });
          }
        });
      }
    });

    const blockNumbers = [...new Set(transfers.map((t) => t.blockNumber))];

    for (const blockNumber of blockNumbers) {
      const block = this.blockchainBlockRepository.create({
        network: this.config.blockchain.unique.network,
        block_number: blockNumber.toString(),
        created_at: new Date(),
      });

      await this.blockchainBlockRepository.save(block);
    }

    for (const transfer of transfers) {
      const { blockNumber, tokenId } = transfer;

      await this.auctionCreationService.createAskAndBroadcast({
        blockNumber: blockNumber.toString(),
        collectionId: collectionId.toString(),
        tokenId: tokenId.toString(),
        ownerAddress,
        priceStep,
        startPrice,
        stopAt,
      });
    }

    const message = `${tokensCount} tokens successfully offered for auction sale`;

    return {
      statusCode: HttpStatus.OK,
      message,
      data: tokenIds,
    };
  }

  /**
   * Mass auction sale
   * @param {Number} collectionId - collection id
   * @return ({Promise<PrepareMassSaleResult>})
   */
  private async prepareMassSale(collectionId: number): Promise<PrepareMassSaleResult> {
    const enabledIds = await this.collections.getEnabledCollectionIds();
    const proxyCollection = ProxyCollection.getInstance(this.unique);

    if (!enabledIds.includes(collectionId)) throw new BadRequestException(`Collection #${collectionId} not enabled`);

    const collectionById = await proxyCollection.getById(collectionId);

    const collectionInChain = collectionById.unwrapOr(null);

    if (collectionInChain === null) throw new BadRequestException(`Collection #${collectionId} not found in chain`);

    const keyring = new Keyring({ type: 'sr25519' });

    const { mainSaleSeed } = this.config;

    if (!mainSaleSeed) throw new BadRequestException('Main sale seed not set');

    const signer = keyring.addFromUri(mainSaleSeed);

    const accountTokens: BnList = await this.unique.rpc.unique.accountTokens(collectionId, {
      Substrate: signer.address,
    });

    const tokenIds = accountTokens.map((t) => t.toNumber()).sort((a, b) => a - b);

    return {
      tokenIds,
      signer,
    };
  }

  /**
   * Get gas price for EVM call
   * @return ({Promise<number>})
   */
  private async getGasPrice(): Promise<number> {
    const gasPrice: BN = await this.unique.rpc.eth.gasPrice();

    return gasPrice.toNumber();
  }
}
