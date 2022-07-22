import { Inject, Injectable, Logger } from '@nestjs/common';
import { Connection, In, Repository } from 'typeorm';
import { ApiPromise } from '@polkadot/api';
import { v4 as uuid } from 'uuid';
import { KeyringPair } from '@polkadot/keyring/types';

import { BroadcastService } from '../../../broadcast/services/broadcast.service';
import { BlockchainBlock, MarketTrade, MoneyTransfer, OffersEntity } from '../../../entity';
import { DatabaseHelper } from '../helpers/database-helper';
import { AuctionStatus, BidStatus, SellingMethod } from '../../../types';
import { BidWithdrawService } from '../bid-withdraw.service';
import { AuctionCancelingService } from '../auction-canceling.service';
import { ASK_STATUS, MONEY_TRANSFER_STATUS, MONEY_TRANSFER_TYPES } from '../../../escrow/constants';
import { ExtrinsicSubmitter } from '../helpers/extrinsic-submitter';
import { MarketConfig } from '../../../config/market-config';
import { OfferEntityDto } from '../../../offers/dto/offer-dto';
import { AuctionCredentials } from '../../providers';
import { InjectSentry, SentryService } from '../../../utils/sentry';

@Injectable()
export class AuctionClosingService {
  private readonly logger = new Logger(AuctionClosingService.name);

  private offersRepository: Repository<OffersEntity>;
  private blockchainBlockRepository: Repository<BlockchainBlock>;
  private auctionKeyring: KeyringPair;
  private tradeRepository: Repository<MarketTrade>;
  private moneyTransferRepository: Repository<MoneyTransfer>;

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
    this.offersRepository = connection.manager.getRepository(OffersEntity);
    this.blockchainBlockRepository = connection.getRepository(BlockchainBlock);
    this.auctionKeyring = auctionCredentials.keyring;
    this.tradeRepository = connection.manager.getRepository(MarketTrade);
    this.moneyTransferRepository = connection.getRepository(MoneyTransfer);
  }

  /**
   * Processes auctions stopping interval.
   */
  async auctionsStoppingIntervalHandler(): Promise<void> {
    const databaseHelper = new DatabaseHelper(this.connection.manager);

    const { auctionIds } = await databaseHelper.updateAuctionsAsStopped();

    if (auctionIds.length === 0) return;

    const auctionData = await this.offersRepository.find({
      where: { id: In(auctionIds), type: SellingMethod.Auction },
    });

    for (const auction of auctionData) {
      try {
        this.broadcastService.sendAuctionStopped(OfferEntityDto.fromOffersEntity(auction));
      } catch (error) {
        this.logger.warn(error);
      }
    }
  }

  /**
   * Processes auction closing.
   */
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

  async processAuctionWithdraws(auction: OffersEntity): Promise<void> {
    const databaseHelper = new DatabaseHelper(this.connection.manager);
    await this.offersRepository.update(auction.id, { status_auction: AuctionStatus.withdrawing });

    const [winner, ...othersBidders] = await databaseHelper.getAuctionAggregatedBids({
      auctionId: auction.id,
      bidStatuses: [BidStatus.finished],
    });

    const offer = await this.offersRepository.findOne({ where: { id: auction.id } });
    const { address_from } = offer;

    if (othersBidders.length === 0) {
      await this.offersRepository.update(offer.id, { status: ASK_STATUS.CANCELLED, status_auction: AuctionStatus.ended });
    }

    for (const bidder of othersBidders) {
      try {
        const { bidderAddress, totalAmount } = bidder;
        const message = AuctionClosingService.getIdentityMessage(offer, bidderAddress, totalAmount);

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

    const getPriceWithoutCommission = (price: bigint, commission: number) => (price * 100n) / BigInt(100 + commission);

    if (winner) {
      const { bidderAddress: winnerAddress, totalAmount: finalPrice } = winner;

      const ownerPrice = getPriceWithoutCommission(finalPrice, this.config.auction.commission);

      let message = AuctionClosingService.getIdentityMessage(offer, winnerAddress, finalPrice);
      message += ` is winner;\n`;
      message += `going to send ${ownerPrice} to owner (${address_from});\n`;
      message += `market fee is ${finalPrice - ownerPrice};\n`;
      this.logger.log(message);

      await this.sendTokenToWinner(offer, winnerAddress);

      const nonce = await this.kusamaApi.rpc.system.accountNextIndex(this.auctionKeyring.address);

      const tx = await this.kusamaApi.tx.balances.transferKeepAlive(address_from, ownerPrice).signAsync(this.auctionKeyring, { nonce });

      const extrinsic = await this.extrinsicSubmitter
        .submit(this.kusamaApi, tx)
        .then(async () => {
          this.logger.log(`transfer done`);
          return true;
        })
        .catch(async (error) => {
          this.logger.warn(`transfer failed with ${error.toString()}`);
        });

      if (extrinsic) {
        await this.offersRepository.update(offer.id, {
          status: ASK_STATUS.BOUGHT,
          address_to: winnerAddress,
          status_auction: AuctionStatus.ended,
        });

        const offersDb = await this.offersRepository.findOne({ where: { id: offer.id } });

        const getBlockCreatedAt = async (blockNum: bigint | number, blockTimeSec = 6n) => {
          let block = await this.blockchainBlockRepository.findOne({
            // @ts-ignore
            block_number: `${blockNum}`,
            network: this.config.blockchain.unique.network,
          });
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

        const ask_created_at = await getBlockCreatedAt(BigInt(offersDb.block_number_ask));
        const buy_created_at = await getBlockCreatedAt(BigInt(offersDb.block_number_buy));

        await this.tradeRepository.insert({
          id: uuid(),
          collection_id: offersDb.collection_id,
          token_id: offersDb.token_id,
          network: this.config.blockchain.unique.network,
          price: `${ownerPrice}`,
          currency: offersDb.currency,
          address_seller: offersDb.address_from,
          address_buyer: winnerAddress,
          block_number_ask: offersDb.block_number_ask,
          block_number_buy: offersDb.block_number_buy,
          ask_created_at,
          buy_created_at,
          originPrice: `${offersDb.price}`,
          status: SellingMethod.Auction,
          commission: `${BigInt(offer.price) - ownerPrice}`,
        });

        await this.moneyTransferRepository
          .createQueryBuilder()
          .insert()
          .into(MoneyTransfer)
          .values(
            this.moneyTransferRepository.create([
              {
                id: uuid(),
                amount: `-${BigInt(offer.price)}`,
                block_number: offersDb.block_number_buy,
                network: 'kusama',
                type: MONEY_TRANSFER_TYPES.DEPOSIT,
                status: MONEY_TRANSFER_STATUS.COMPLETED,
                created_at: new Date(),
                updated_at: new Date(),
                extra: { address: offersDb.address_from },
                currency: '2', // TODO: check this
              },
              {
                id: uuid(),
                amount: `${ownerPrice}`,
                block_number: offersDb.block_number_buy,
                network: 'kusama',
                type: MONEY_TRANSFER_TYPES.WITHDRAW,
                status: MONEY_TRANSFER_STATUS.COMPLETED,
                created_at: new Date(),
                updated_at: new Date(),
                extra: { address: offersDb.address_from },
                currency: '2', // TODO: check this
              },
            ]),
          )
          .execute();
      }
    } else {
      const offers = await this.offersRepository.findOne({ where: { id: auction.id } });
      await this.auctionCancellingService.sendTokenBackToOwner(offers);
      await this.offersRepository.update(offers.id, { status: ASK_STATUS.CANCELLED });
    }

    // offer.auction = auction;
    this.broadcastService.sendAuctionClosed(OfferEntityDto.fromOffersEntity(offer));
  }

  private async sendTokenToWinner(offersEntity: OffersEntity, winnerAddress: string): Promise<void> {
    try {
      const { collection_id, token_id } = offersEntity;

      const tx = await this.uniqueApi.tx.unique
        .transfer({ Substrate: winnerAddress }, collection_id, token_id, 1)
        .signAsync(this.auctionKeyring);

      const { blockNumber } = await this.extrinsicSubmitter.submit(this.uniqueApi, tx);

      const block = this.blockchainBlockRepository.create({
        network: this.config.blockchain.unique.network,
        block_number: blockNumber.toString(),
        created_at: new Date(),
      });

      await this.connection.createQueryBuilder().insert().into(BlockchainBlock).values(block).orIgnore().execute();
      await this.offersRepository.update(offersEntity.id, { block_number_buy: block.block_number });
    } catch (error) {
      this.logger.error(error);
    }
  }

  static getIdentityMessage(offer: OffersEntity, address: string, amount: bigint): string {
    return `${offer.collection_id}/${offer.token_id}; ${address}  (current amount: ${amount})`;
  }
}
