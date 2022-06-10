import { Injectable, BadRequestException, Inject, HttpStatus, Logger } from '@nestjs/common';
import { MassFixPriceSaleDTO, MassFixPriceSaleResult, MassAuctionSaleDTO, MassAuctionSaleResult } from '../dto/collections.dto';
import { CollectionsService } from './collections.service';
import { Keyring } from '@polkadot/api';
import { Observable, Subscriber } from 'rxjs';
import { Connection, Repository } from 'typeorm';
import { BnList } from '@polkadot/util/types';
import { MarketConfig } from '../../config/market-config';
import { Web3Service } from './web3.service';
import { subToEth } from 'src/utils/blockchain/web3';
import { BlockchainBlock } from '../../entity/blockchain-block';
import { DateHelper } from 'src/utils/date-helper';
import { AuctionCreationService } from 'src/auction/services/auction-creation.service';
import { PrepareMassSaleResult, TransferResult } from '../types';

@Injectable()
export class MassSaleService {
  private readonly logger: Logger;
  private readonly blockchainBlockRepository: Repository<BlockchainBlock>;

  constructor(
    @Inject('DATABASE_CONNECTION') private connection: Connection,
    @Inject('UNIQUE_API') private unique,
    @Inject('CONFIG') private config: MarketConfig,
    private readonly collections: CollectionsService,
    private readonly web3: Web3Service,
    private readonly auctionCreationService: AuctionCreationService,
  ) {
    this.logger = new Logger(MassSaleService.name);
    this.blockchainBlockRepository = connection.getRepository(BlockchainBlock);
  }

  /**
   * Mass fix price sale
   * @param {MassFixPriceSaleDTO} data - mass fix price sale params
   * @return ({Promise<MassFixPriceSaleResult>})
   */
  async massFixPriceSale(data: MassFixPriceSaleDTO): Promise<MassFixPriceSaleResult> {
    const { collectionId, price } = data;
    const { signer, tokenIds } = await this.prepareMassSale(collectionId);

    const marketContractAddress = this.config.blockchain.unique.contractAddress;
    if (!marketContractAddress) throw new BadRequestException('Market contract address not set');

    const marketContract = this.web3.getMarketContract(marketContractAddress);
    const collectionContract = this.web3.getCollectionContract(collectionId);

    for (const tokenId of tokenIds) {
      const transferTxHash = await this.unique.tx.unique
        .transfer({ Ethereum: subToEth(signer.address) }, collectionId, tokenId, 1)
        .signAndSend(signer, { nonce: -1 });

      this.logger.debug(`massFixPriceSale: Token #${tokenId} transfer: ${transferTxHash.toHuman()}`);

      const approveTxHash = await this.unique.tx.evm
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
        .signAndSend(signer, { nonce: -1 });

      this.logger.debug(`massFixPriceSale: Token #${tokenId} approve: ${approveTxHash.toHuman()}`);

      const askTxHash = await this.unique.tx.evm
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
        .signAndSend(signer, { nonce: -1 });

      this.logger.debug(`massFixPriceSale: Token #${tokenId} add ask: ${askTxHash.toHuman()}`);
    }

    const tokensCount = tokenIds.length;

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

    const tokensCount = tokenIds.length;

    const message = `${tokensCount} tokens successfully offered for fix price sale`;

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

    if (!enabledIds.includes(collectionId)) throw new BadRequestException(`Collection #${collectionId} not enabled`);

    const collectionById = await this.unique.rpc.unique.collectionById(collectionId);

    const collectionInChain = collectionById.unwrapOr(null);

    if (collectionInChain === null) throw new BadRequestException(`Collection #${collectionId} not found in chain`);

    const keyring = new Keyring({ type: 'sr25519' });

    const { mainSaleSeed } = this.config;

    if (!mainSaleSeed) throw new BadRequestException('Main sale seed not set');

    const signer = keyring.addFromUri(mainSaleSeed);

    const accountTokens = await this.unique.rpc.unique.accountTokens(collectionId, {
      Substrate: signer.address,
    });

    const tokenIds: BnList = accountTokens.sort((a, b) => a - b);

    return {
      tokenIds,
      signer,
    };
  }
}
