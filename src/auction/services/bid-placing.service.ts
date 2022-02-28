import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import { Connection, Repository } from 'typeorm';
import { ApiPromise } from '@polkadot/api';
import { v4 as uuid } from 'uuid';

import { AuctionEntity, BidEntity } from '../entities';
import { BroadcastService } from '../../broadcast/services/broadcast.service';
import { OfferContractAskDto } from '../../offers/dto/offer-dto';
import { BlockchainBlock, ContractAsk } from '../../entity';
import { MarketConfig } from '../../config/market-config';
import { ExtrinsicSubmitter } from './helpers/extrinsic-submitter';
import { BidStatus } from '../types';
import { DatabaseHelper } from './helpers/database-helper';

type PlaceBidArgs = {
  collectionId: number;
  tokenId: number;
  amount: string;
  bidderAddress: string;
  tx: string;
};

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
      await this.connection.transaction<void>(async (transactionEntityManager) => {
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

  private async tryPlacePendingBid(placeBidArgs: PlaceBidArgs): Promise<[ContractAsk, BidEntity]> {
    const { collectionId, tokenId, bidderAddress } = placeBidArgs;

    return this.connection.transaction<[ContractAsk, BidEntity]>(async (transactionEntityManager) => {
      const databaseHelper = new DatabaseHelper(transactionEntityManager);

      const contractAsk = await databaseHelper.getActiveAuctionContract({ collectionId, tokenId });
      const priceStep = BigInt(contractAsk.auction.priceStep);
      const isFirstBid = contractAsk.price === contractAsk.auction.startPrice;
      const currentPendingPrice = isFirstBid
        ? BigInt(contractAsk.price)
        : BigInt(contractAsk.price) + BigInt(contractAsk.auction.priceStep);

      const amount = BigInt(placeBidArgs.amount);

      if (priceStep > amount) throw new Error(`Minimum price step is ${priceStep}`);

      const userCurrentPendingAmount = await databaseHelper.getUserPendingSum({
        auctionId: contractAsk.auction.id,
        bidderAddress,
      });

      const userNextPendingAmount = userCurrentPendingAmount + amount;

      if (userNextPendingAmount < currentPendingPrice) {
        let message = `You offered ${userNextPendingAmount} total, but current price is ${currentPendingPrice}`;
        if (!isFirstBid) message += ` (price + price step)`;

        throw new Error(message);
      }

      const nextUserBid = transactionEntityManager.create(BidEntity, {
        id: uuid(),
        status: BidStatus.minting,
        bidderAddress,
        amount: amount.toString(),
        balance: userNextPendingAmount.toString(),
        auctionId: contractAsk.auction.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await transactionEntityManager.update(ContractAsk, contractAsk.id, { price: userNextPendingAmount.toString() });
      await transactionEntityManager.save(BidEntity, nextUserBid);

      contractAsk.auction.bids = await databaseHelper.getBids({ auctionId: contractAsk.auction.id });

      return [contractAsk, nextUserBid];
    });
  }
}
