import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import { Connection, EntityManager, Repository } from 'typeorm';
import { ApiPromise } from '@polkadot/api';
import { stringify } from '@polkadot/util';
import { v4 as uuid } from 'uuid';

import { AuctionEntity, BidEntity } from '../entities';
import { BroadcastService } from '../../broadcast/services/broadcast.service';
import { OfferContractAskDto } from '../../offers/dto/offer-dto';
import { BlockchainBlock, ContractAsk } from '../../entity';
import { MarketConfig } from '../../config/market-config';
import { ExtrinsicSubmitter } from './helpers/extrinsic-submitter';
import { BidStatus, CalculateArgs, CalculationInfo, PlaceBidArgs } from '../types';
import { DatabaseHelper } from './helpers/database-helper';
import { encodeAddress } from '@polkadot/util-crypto';

@Injectable()
export class BidPlacingService {
  private readonly logger = new Logger(BidPlacingService.name);

  private bidRepository: Repository<BidEntity>;
  private readonly auctionRepository: Repository<AuctionEntity>;
  private blockchainBlockRepository: Repository<BlockchainBlock>;
  private readonly contractAskRepository: Repository<ContractAsk>;

  constructor(
    @Inject('DATABASE_CONNECTION') private connection: Connection,
    private broadcastService: BroadcastService,
    @Inject('KUSAMA_API') private kusamaApi: ApiPromise,
    @Inject('CONFIG') private config: MarketConfig,
    private readonly extrinsicSubmitter: ExtrinsicSubmitter,
  ) {
    this.bidRepository = connection.manager.getRepository(BidEntity);
    this.contractAskRepository = connection.getRepository(ContractAsk);
    this.blockchainBlockRepository = connection.getRepository(BlockchainBlock);
    this.auctionRepository = connection.manager.getRepository(AuctionEntity);
  }

  async placeBid(placeBidArgs: PlaceBidArgs): Promise<OfferContractAskDto> {
    const { tx } = placeBidArgs;

    let contractAsk: ContractAsk;
    let nextUserBid: BidEntity;

    try {
      [contractAsk, nextUserBid] = await this.tryPlacePendingBid(placeBidArgs);

      const offer = OfferContractAskDto.fromContractAsk(contractAsk);

      await this.broadcastService.sendBidPlaced(offer);
      this.logger.debug(``)
      return offer;
    } catch (error) {
      this.logger.warn(error);

      throw new BadRequestException(error.message);
    } finally {
      if (contractAsk && nextUserBid) {
        await this.extrinsicSubmitter
          .submit(this.kusamaApi, tx)
          .then(({ blockNumber }) => this.handleBidTxSuccess(placeBidArgs, contractAsk, nextUserBid, blockNumber))
          .catch(() => this.handleBidTxFail(placeBidArgs, contractAsk, nextUserBid));
      }
    }
  }

  private async handleBidTxSuccess(
    placeBidArgs: PlaceBidArgs,
    oldContractAsk: ContractAsk,
    userBid: BidEntity,
    blockNumber: bigint,
  ): Promise<void> {
    try {
      await this.bidRepository.update(userBid.id, {
        status: BidStatus.finished,
        blockNumber: blockNumber.toString(),
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

  private async handleBidTxFail(placeBidArgs: PlaceBidArgs, oldContractAsk: ContractAsk, userBid: BidEntity): Promise<void> {
    const {
      auction: { id: auctionId },
    } = oldContractAsk;

    try {
      await this.connection.transaction<void>('REPEATABLE READ', async (transactionEntityManager) => {
        const databaseHelper = new DatabaseHelper(transactionEntityManager);
        await transactionEntityManager.update(BidEntity, userBid.id, { status: BidStatus.error });

        const newWinner = await databaseHelper.getAuctionPendingWinner({ auctionId });
        const newOfferPrice = newWinner ? newWinner.totalAmount.toString() : oldContractAsk.auction.startPrice;
        await transactionEntityManager.update(ContractAsk, oldContractAsk.id, { price: newOfferPrice });
      });
    } catch (error) {
      const fullError = {
        method: 'handleBidTxFail',
        message: error.message,
        placeBidArgs,
        oldContractAsk,
        userBid,
      };

      this.logger.error(JSON.stringify(fullError));
    }
  }

  getCalculationInfo(calculateArgs: CalculateArgs, entityManager?: EntityManager): Promise<[CalculationInfo, ContractAsk]> {
    const { collectionId, tokenId, bidderAddress } = calculateArgs;

    const calculate = async (entityManager: EntityManager): Promise<[CalculationInfo, ContractAsk]> => {
      const databaseHelper = new DatabaseHelper(entityManager);
      const contractAsk = await databaseHelper.getActiveAuctionContract({ collectionId, tokenId });

      const { auction: { id: auctionId } } = contractAsk;
      const price = BigInt(contractAsk.price);
      const startPrice = BigInt(contractAsk.auction.startPrice);
      const priceStep = BigInt(contractAsk.auction.priceStep);

      const bidderPendingAmount = await databaseHelper.getUserPendingSum({
        auctionId: contractAsk.auction.id,
        bidderAddress,
      });

      let minBidderAmount = price - bidderPendingAmount;

      const isFirstBid = price === startPrice && (
        await databaseHelper.getAuctionPendingWinner({ auctionId }) === undefined);

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
        contractAsk,
      ];
    };

    return entityManager ? calculate(entityManager) : this.connection.transaction('REPEATABLE READ', calculate);
  }

  private async tryPlacePendingBid(placeBidArgs: PlaceBidArgs): Promise<[ContractAsk, BidEntity]> {
    const { bidderAddress } = placeBidArgs;

    const placeWithTransaction = async (transactionEntityManager: EntityManager): Promise<[ContractAsk, BidEntity]> => {
      const databaseHelper = new DatabaseHelper(transactionEntityManager);

      const [calculationInfo, contractAsk] = await this.getCalculationInfo(placeBidArgs, transactionEntityManager);
      const { minBidderAmount, bidderPendingAmount, priceStep, contractPendingPrice } = calculationInfo;
      const amount = BigInt(placeBidArgs.amount);

      this.logger.debug(`${this.tryPlacePendingBid.name}: ${stringify({... placeBidArgs, ...calculationInfo })}`);

      if ((contractPendingPrice >= priceStep) && (amount < priceStep)) {
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

      const nextUserBid = transactionEntityManager.create(BidEntity, {
        id: uuid(),
        status: BidStatus.minting,
        bidderAddress: encodeAddress(bidderAddress),
        amount: amount.toString(),
        balance: userNextPendingAmount.toString(),
        auctionId: contractAsk.auction.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      contractAsk.price = userNextPendingAmount.toString();
      await transactionEntityManager.update(ContractAsk, contractAsk.id, { price: userNextPendingAmount.toString() });

      await transactionEntityManager.save(BidEntity, nextUserBid);

      contractAsk.auction.bids = await databaseHelper.getBids({ auctionId: contractAsk.auction.id });

      return [contractAsk, nextUserBid];
    };

    return this.connection.transaction<[ContractAsk, BidEntity]>('REPEATABLE READ', placeWithTransaction);
  }
}
