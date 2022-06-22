import { Inject, Injectable, Logger } from '@nestjs/common';
import { Connection, Repository, In } from 'typeorm';
import { ApiPromise } from '@polkadot/api';
import { v4 as uuid } from 'uuid';
import { KeyringPair } from '@polkadot/keyring/types';

import { BroadcastService } from '../../../broadcast/services/broadcast.service';
import { AuctionEntity } from '../../entities';
import { BlockchainBlock, ContractAsk, MarketTrade, SellingMethod } from '../../../entity';
import { DatabaseHelper } from '../helpers/database-helper';
import { AuctionStatus, BidStatus } from '../../types';
import { BidWithdrawService } from '../bid-withdraw.service';
import { AuctionCancelingService } from '../auction-canceling.service';
import { ASK_STATUS } from '../../../escrow/constants';
import { ExtrinsicSubmitter } from '../helpers/extrinsic-submitter';
import { MarketConfig } from '../../../config/market-config';
import { OfferContractAskDto } from '../../../offers/dto/offer-dto';
import { AuctionCredentials } from '../../providers';
import { InjectSentry, SentryService } from '../../../utils/sentry';
import { subToEth } from '../../../utils/blockchain/web3';

@Injectable()
export class AuctionClosingService {
  private readonly logger = new Logger(AuctionClosingService.name);

  private auctionRepository: Repository<AuctionEntity>;
  private contractAskRepository: Repository<ContractAsk>;
  private blockchainBlockRepository: Repository<BlockchainBlock>;
  private auctionKeyring: KeyringPair;
  private tradeRepository: Repository<MarketTrade>;

  constructor(
    @Inject('DATABASE_CONNECTION') private connection: Connection,
    @Inject('KUSAMA_API') private kusamaApi: ApiPromise,
    @Inject('UNIQUE_API') private uniqueApi: ApiPromise,
    private broadcastService: BroadcastService,
    private bidWithdrawService: BidWithdrawService,
    private auctionCancellingService: AuctionCancelingService,
    private readonly extrinsicSubmitter: ExtrinsicSubmitter,
    @Inject('CONFIG') private config: MarketConfig,
    @Inject('AUCTION_CREDENTIALS') private auctionCredentials: AuctionCredentials,
    @InjectSentry() private readonly sentryService: SentryService,
  ) {
    this.auctionRepository = connection.manager.getRepository(AuctionEntity);
    this.contractAskRepository = connection.manager.getRepository(ContractAsk);
    this.blockchainBlockRepository = connection.getRepository(BlockchainBlock);
    this.auctionKeyring = auctionCredentials.keyring;
    this.tradeRepository = connection.manager.getRepository(MarketTrade);
  }

  async auctionsStoppingIntervalHandler(): Promise<void> {
    const databaseHelper = new DatabaseHelper(this.connection.manager);

    const { contractIds } = await databaseHelper.updateAuctionsAsStopped();

    if (contractIds.length === 0) return;

    const contractAsks = await this.contractAskRepository.find({
      where: { id: In(contractIds) },
      relations: ['auction'],
    });

    for (const contractAsk of contractAsks) {
      try {
        this.broadcastService.sendAuctionStopped(OfferContractAskDto.fromContractAsk(contractAsk));
      } catch (error) {
        this.logger.warn(error);
      }
    }
  }

  async auctionsWithdrawingIntervalHandler(): Promise<void> {
    const databaseHelper = new DatabaseHelper(this.connection.manager);

    const auctions = await databaseHelper.findAuctionsReadyForWithdraw();

    /*const withdrawsPromises = auctions.map(async (auction) => {
      await this.processAuctionWithdraws(auction);
    });*/

    try {
      for (const auction of auctions) {
        await this.processAuctionWithdraws(auction);
      }
    } catch (error) {
      this.logger.error(error);
      this.sentryService.instance().captureException(error);
    }
    //await Promise.all(withdrawsPromises);
  }

  async processAuctionWithdraws(auction: AuctionEntity): Promise<void> {
    const databaseHelper = new DatabaseHelper(this.connection.manager);
    await this.auctionRepository.update(auction.id, { status: AuctionStatus.withdrawing });

    const [winner, ...othersBidders] = await databaseHelper.getAuctionAggregatedBids({
      auctionId: auction.id,
      bidStatuses: [BidStatus.finished],
    });

    const contractAsk = await this.contractAskRepository.findOne(auction.contractAskId);
    const { address_from } = contractAsk;

    if (othersBidders.length === 0) {
      await this.contractAskRepository.update(contractAsk.id, { status: ASK_STATUS.CANCELLED });
      await this.auctionRepository.update(auction.id, { status: AuctionStatus.ended });
    }

    for (const bidder of othersBidders) {
      try {
        const { bidderAddress, totalAmount } = bidder;
        const message = AuctionClosingService.getIdentityMessage(contractAsk, bidderAddress, totalAmount);

        if (totalAmount > 0) {
          this.logger.log(message + ` is not a winner, going to withdraw`);

          await this.bidWithdrawService.withdrawByMarket(auction, bidderAddress, totalAmount);
        }
        this.logger.log(message + ' nothing to withdraw');
      } catch (error) {
        this.logger.error(error);
        this.sentryService.instance().captureException(error);
      }
    }

    // force withdraw bids for all except winner
    /* await Promise.all(
      othersBidders.map(({ bidderAddress, totalAmount }) => {
        const message = AuctionClosingService.getIdentityMessage(contractAsk, bidderAddress, totalAmount);

        if (totalAmount > 0) {
          this.logger.log(message + ` is not a winner, going to withdraw`);

          return this.bidWithdrawService.withdrawByMarket(auction, bidderAddress, totalAmount);
        }

        this.logger.log(message + ' nothing to withdraw');
      }),
    ); */

    if (winner) {
      const { bidderAddress: winnerAddress, totalAmount: finalPrice } = winner;

      const marketFee = (finalPrice * BigInt(this.config.auction.commission)) / 100n;
      const ownerPrice = finalPrice - marketFee;

      let message = AuctionClosingService.getIdentityMessage(contractAsk, winnerAddress, finalPrice);
      message += ` is winner;\n`;
      message += `going to send ${ownerPrice} to owner (${address_from});\n`;
      message += `market fee is ${marketFee};\n`;
      this.logger.log(message);

      await this.sendTokenToWinner(contractAsk, winnerAddress);

      const tx = await this.kusamaApi.tx.balances.transferKeepAlive(address_from, ownerPrice).signAsync(this.auctionKeyring);

      const extrinsic = await this.extrinsicSubmitter
        .submit(this.kusamaApi, tx)
        .then(() => {
          this.logger.log(`transfer done`);
          return true;
        })
        .catch((error) => this.logger.warn(`transfer failed with ${error.toString()}`));

      if (extrinsic) {
        await this.contractAskRepository.update(contractAsk.id, { status: ASK_STATUS.BOUGHT, address_to: subToEth(winnerAddress) });
        await this.auctionRepository.update(auction.id, { status: AuctionStatus.ended });

        const contractAskDb = await this.contractAskRepository.findOne(contractAsk.id);

        const getPriceWithoutCommission = (price: bigint, commission: number) => (price * 100n) / BigInt(100 + commission);

        const price = getPriceWithoutCommission(BigInt(contractAsk.price), this.config.auction.commission);

        const getBlockCreatedAt = async (blockNum: bigint | number, blockTimeSec = 6n) => {
          let block = await this.blockchainBlockRepository.findOne({ block_number: `${blockNum}`, network: this.config.blockchain.unique.network });
          if (!!block) return block.created_at;
          block = await this.blockchainBlockRepository
            .createQueryBuilder('blockchain_block')
            .orderBy('block_number', 'DESC')
            .where('blockchain_block.network = :network AND blockchain_block.block_number < :num', {
              network: this.config.blockchain.unique.network,
              num: blockNum,
            })
            .limit(1)
            .getOne();
          if (!!block) {
            const difference = BigInt(blockNum) - BigInt(block.block_number);
            return new Date(block.created_at.getTime() + Number(difference * 1000n * blockTimeSec)); // predict time for next block
          }
          return new Date();
        };

        const ask_created_at = await getBlockCreatedAt(BigInt(contractAskDb.block_number_ask));
        const buy_created_at = await getBlockCreatedAt(BigInt(contractAskDb.block_number_buy));

        await this.tradeRepository.insert({
          id: uuid(),
          collection_id: contractAskDb.collection_id,
          token_id: contractAskDb.token_id,
          network: this.config.blockchain.unique.network,
          price: `${price}`,
          currency: contractAskDb.currency,
          address_seller: contractAskDb.address_from,
          address_buyer: winnerAddress,
          block_number_ask: contractAskDb.block_number_ask,
          block_number_buy: contractAskDb.block_number_buy,
          ask_created_at,
          buy_created_at,
          originPrice: `${contractAskDb.price}`,
          status: SellingMethod.Auction,
          commission: `${BigInt(contractAsk.price) - price}`,
        });
      }
    } else {
      const contractAsk = await this.contractAskRepository.findOne(auction.contractAskId);
      await this.auctionCancellingService.sendTokenBackToOwner(contractAsk);
      await this.contractAskRepository.update(contractAsk.id, { status: ASK_STATUS.CANCELLED });
    }

    contractAsk.auction = auction;
    this.broadcastService.sendAuctionClosed(OfferContractAskDto.fromContractAsk(contractAsk));
  }

  private async sendTokenToWinner(contractAsk: ContractAsk, winnerAddress: string): Promise<void> {
    try {
      const { collection_id, token_id } = contractAsk;

      const tx = await this.uniqueApi.tx.unique.transfer({ Substrate: winnerAddress }, collection_id, token_id, 1).signAsync(this.auctionKeyring);

      const { blockNumber } = await this.extrinsicSubmitter.submit(this.uniqueApi, tx);

      const block = this.blockchainBlockRepository.create({
        network: this.config.blockchain.unique.network,
        block_number: blockNumber.toString(),
        created_at: new Date(),
      });

      await this.blockchainBlockRepository.save(block);
      await this.contractAskRepository.update(contractAsk.id, { block_number_buy: block.block_number });
    } catch (error) {
      this.logger.error(error);
    }
  }

  static getIdentityMessage(contract: ContractAsk, address: string, amount: bigint): string {
    return `${contract.collection_id}/${contract.token_id}; ${address}  (current amount: ${amount})`;
  }
}
