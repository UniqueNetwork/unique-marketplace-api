import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import { Connection, EntityManager, Repository } from 'typeorm';
import { ApiPromise } from '@polkadot/api';
import { stringify } from '@polkadot/util';
import { v4 as uuid } from 'uuid';

import { AuctionEntity, BidEntity } from '../entities';
import { BroadcastService } from '../../broadcast/services/broadcast.service';
import { OfferEntityDto } from '../../offers/dto/offer-dto';
import { AuctionBidEntity, BlockchainBlock, ContractAsk, MoneyTransfer, OffersEntity } from '../../entity';
import { MarketConfig } from '../../config/market-config';
import { ExtrinsicSubmitter } from './helpers/extrinsic-submitter';
import { BidStatus, CalculateArgs, CalculationInfo, PlaceBidArgs, AuctionStatus } from '../../types';
import { DatabaseHelper } from './helpers/database-helper';
import { encodeAddress } from '@polkadot/util-crypto';
import { InjectKusamaAPI } from '../../blockchain';
import { MONEY_TRANSFER_TYPES, MONEY_TRANSFER_STATUS } from '../../escrow/constants';

@Injectable()
export class BidPlacingService {
  private readonly logger = new Logger(BidPlacingService.name);

  private bidRepository: Repository<AuctionBidEntity>;
  private blockchainBlockRepository: Repository<BlockchainBlock>;
  private readonly offersRepository: Repository<OffersEntity>;
  private moneyTransferRepository: Repository<MoneyTransfer>;

  constructor(
    @Inject('DATABASE_CONNECTION') private connection: Connection,
    private broadcastService: BroadcastService,
    @InjectKusamaAPI() private kusamaApi: ApiPromise,
    @Inject('CONFIG') private config: MarketConfig,
    private readonly extrinsicSubmitter: ExtrinsicSubmitter,
  ) {
    this.bidRepository = connection.manager.getRepository(AuctionBidEntity);
    this.offersRepository = connection.getRepository(OffersEntity);
    this.blockchainBlockRepository = connection.getRepository(BlockchainBlock);

    this.moneyTransferRepository = connection.getRepository(MoneyTransfer);
  }

  async placeBid(placeBidArgs: PlaceBidArgs): Promise<OfferEntityDto> {
    const { tx } = placeBidArgs;

    let offers: OffersEntity;
    let nextUserBid: AuctionBidEntity;

    const balance = BigInt((await this.kusamaApi.query.system.account(placeBidArgs.bidderAddress)).data.free.toJSON());

    const bidsBalance = await this.getBidsBalance(placeBidArgs.collectionId, placeBidArgs.tokenId, placeBidArgs.bidderAddress);

    if (BigInt(placeBidArgs.amount) > balance + bidsBalance) {
      throw new BadRequestException('Insufficient funds to bet');
    }

    try {
      [offers, nextUserBid] = await this.tryPlacePendingBid(placeBidArgs);
      return OfferEntityDto.fromOffersEntity(offers);
    } catch (error) {
      this.logger.warn(error);
      throw new BadRequestException(error.message);
    } finally {
      if (offers && nextUserBid) {
        await this.extrinsicSubmitter
          .submit(this.kusamaApi, tx)
          .then(async ({ blockNumber }) => {
            this.broadcastService.sendBidPlaced(OfferEntityDto.fromOffersEntity(offers));
            await this.handleBidTxSuccess(placeBidArgs, offers, nextUserBid, blockNumber);
          })
          .catch(async () => {
            this.broadcastService.sendAuctionError(OfferEntityDto.fromOffersEntity(offers), 'Bid is not finished');
            await this.handleBidTxFail(placeBidArgs, offers, nextUserBid);
          });
      }
    }
  }

  private async handleBidTxSuccess(
    placeBidArgs: PlaceBidArgs,
    oldContractAsk: OffersEntity,
    userBid: AuctionBidEntity,
    blockNumber: bigint,
  ): Promise<void> {
    try {
      await this.bidRepository.update(userBid.id, {
        status: BidStatus.finished,
        blockNumber: blockNumber.toString(),
      });
      await this.moneyTransferRepository.save({
        id: uuid(),
        amount: placeBidArgs.amount,
        block_number: blockNumber.toString(),
        network: 'kusama',
        type: MONEY_TRANSFER_TYPES.DEPOSIT,
        status: MONEY_TRANSFER_STATUS.COMPLETED,
        created_at: new Date(),
        updated_at: new Date(),
        extra: { address: placeBidArgs.bidderAddress },
        currency: '2', // TODO: check this
      });
    } catch (error) {
      const fullError = {
        method: 'handleBidTxSuccess',
        message: error.message,
        placeBidArgs,
        oldContractAsk,
        userBid,
      };

      this.logger.error(JSON.stringify(fullError));
    }
  }

  private async handleBidTxFail(placeBidArgs: PlaceBidArgs, oldOffer: OffersEntity, userBid: AuctionBidEntity): Promise<void> {
    const auctionId = oldOffer.id;
    try {
      await this.connection.transaction<void>('REPEATABLE READ', async (transactionEntityManager) => {
        const databaseHelper = new DatabaseHelper(transactionEntityManager);
        await transactionEntityManager.update(AuctionBidEntity, userBid.id, { status: BidStatus.error });

        const newWinner = await databaseHelper.getAuctionPendingWinner({ auctionId });
        const newOfferPrice = newWinner ? newWinner.totalAmount.toString() : oldOffer.startPrice;
        await transactionEntityManager.update(OffersEntity, oldOffer.id, { price: newOfferPrice });
      });
    } catch (error) {
      const fullError = {
        method: 'handleBidTxFail',
        message: error.message,
        placeBidArgs,
        oldOffer,
        userBid,
      };

      this.logger.error(JSON.stringify(fullError));
    }
  }

  getCalculationInfo(calculateArgs: CalculateArgs, entityManager?: EntityManager): Promise<[CalculationInfo, OffersEntity]> {
    const { collectionId, tokenId, bidderAddress } = calculateArgs;

    const calculate = async (entityManager: EntityManager): Promise<[CalculationInfo, OffersEntity]> => {
      const databaseHelper = new DatabaseHelper(entityManager);
      const auction = await databaseHelper.getActiveAuction({ collectionId, tokenId });

      const auctionId = auction.id;
      const price = BigInt(auction.price);
      const startPrice = BigInt(auction.startPrice);
      const priceStep = BigInt(auction.priceStep);

      const bidderPendingAmount = await databaseHelper.getUserPendingSum({
        auctionId: auction.id,
        bidderAddress,
      });

      let minBidderAmount = price - bidderPendingAmount;

      const isFirstBid = price === startPrice && (await databaseHelper.getAuctionPendingWinner({ auctionId })) === undefined;

      if (minBidderAmount > 0 && !isFirstBid) {
        minBidderAmount += priceStep;
      } else {
        // bidder is winner at the moment or this is first bid
      }

      return [
        {
          contractPendingPrice: price,
          priceStep,
          bidderPendingAmount,
          minBidderAmount,
        },
        auction,
      ];
    };

    return entityManager ? calculate(entityManager) : this.connection.transaction('REPEATABLE READ', calculate);
  }

  private async tryPlacePendingBid(placeBidArgs: PlaceBidArgs): Promise<[OffersEntity, AuctionBidEntity]> {
    const { bidderAddress } = placeBidArgs;

    const placeWithTransaction = async (transactionEntityManager: EntityManager): Promise<[OffersEntity, AuctionBidEntity]> => {
      const databaseHelper = new DatabaseHelper(transactionEntityManager);

      const [calculationInfo, offers] = await this.getCalculationInfo(placeBidArgs, transactionEntityManager);
      const { minBidderAmount, bidderPendingAmount, priceStep, contractPendingPrice } = calculationInfo;
      const amount = BigInt(placeBidArgs.amount);

      this.logger.debug(`${this.tryPlacePendingBid.name}: ${stringify({ ...placeBidArgs, ...calculationInfo })}`);

      if (contractPendingPrice >= priceStep && amount < priceStep) {
        throw new BadRequestException(`Min price step is ${priceStep}`);
      }

      if (amount < minBidderAmount) {
        throw new BadRequestException({
          ...calculationInfo,
          amount,
          message: `Offered bid is not enough`,
        });
      }

      const userNextPendingAmount = bidderPendingAmount + amount;

      const nextUserBid = transactionEntityManager.create(AuctionBidEntity, {
        id: uuid(),
        status: BidStatus.minting,
        bidderAddress: encodeAddress(bidderAddress),
        amount: amount.toString(),
        balance: userNextPendingAmount.toString(),
        auctionId: offers.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      offers.price = userNextPendingAmount.toString();
      await transactionEntityManager.update(OffersEntity, offers.id, {
        price: userNextPendingAmount.toString(),
      });

      await transactionEntityManager.save(AuctionBidEntity, nextUserBid);

      offers.bids = await databaseHelper.getBids({ auctionId: offers.id });

      return [offers, nextUserBid];
    };

    return this.connection.transaction<[OffersEntity, AuctionBidEntity]>('REPEATABLE READ', placeWithTransaction);
  }

  private async getBidsBalance(collectionId: number, tokenId: number, bidderAddress: string) {
    const bids = await this.bidRepository
      .createQueryBuilder('bids')
      .leftJoinAndSelect('bids.auction', 'auctions')
      .leftJoinAndSelect('auctions.contractAsk', 'contract_ask')
      .where('bids.bidderAddress = :bidderAddress', { bidderAddress: encodeAddress(bidderAddress) })
      .andWhere('bids.status = :status', { status: BidStatus.finished })
      .andWhere('auctions.status = :auctionsStatus', { auctionsStatus: AuctionStatus.active })
      .andWhere('contract_ask.collection_id = :collectionId', { collectionId })
      .andWhere('contract_ask.token_id = :tokenId', { tokenId })
      .getMany();

    return bids.reduce((acc, bid) => acc + BigInt(bid.balance), BigInt(0));
  }
}
