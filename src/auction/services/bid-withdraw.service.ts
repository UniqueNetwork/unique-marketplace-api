import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import { Connection, Repository } from 'typeorm';
import { AuctionEntity, BidEntity } from '../entities';
import { ContractAsk } from '../../entity';
import { BroadcastService } from '../../broadcast/services/broadcast.service';
import { ApiPromise } from '@polkadot/api';
import { MarketConfig } from '../../config/market-config';
import { ExtrinsicSubmitter } from './helpers/extrinsic-submitter';
import { BidStatus } from '../types';
import { DatabaseHelper } from './helpers/database-helper';
import { v4 as uuid } from 'uuid';
import { AuctionCredentials } from '../providers';

type BidWithdrawArgs = {
  collectionId: number;
  tokenId: number;
  bidderAddress: string;
  amount: string;
};

@Injectable()
export class BidWithdrawService {
  private readonly logger = new Logger(BidWithdrawService.name);

  private readonly bidRepository: Repository<BidEntity>;
  private readonly auctionRepository: Repository<AuctionEntity>;
  private readonly contractAskRepository: Repository<ContractAsk>;

  constructor(
    @Inject('DATABASE_CONNECTION') private connection: Connection,
    private broadcastService: BroadcastService,
    @Inject('KUSAMA_API') private kusamaApi: ApiPromise,
    @Inject('CONFIG') private config: MarketConfig,
    @Inject('AUCTION_CREDENTIALS') private auctionCredentials: AuctionCredentials,
    private readonly extrinsicSubmitter: ExtrinsicSubmitter,
  ) {
    this.bidRepository = connection.manager.getRepository(BidEntity);
    this.auctionRepository = connection.manager.getRepository(AuctionEntity);
    this.contractAskRepository = connection.getRepository(ContractAsk);
  }

  async withdrawBidByBidder(args: BidWithdrawArgs): Promise<void> {
    let withdrawingBid: BidEntity;

    try {
      withdrawingBid = await this.tryCreateWithdrawingBid(args);

      return '' as any;
    } catch (error) {
      throw new BadRequestException(error.message);
    } finally {
      if (withdrawingBid) {
        await this.makeWithdrawalTransfer(withdrawingBid);
      }
    }
  }

  async withdrawByMarket(auction: AuctionEntity, bidderAddress: string, amount: bigint): Promise<void> {
    const withdrawingBid = this.connection.manager.create(BidEntity, {
      id: uuid(),
      status: BidStatus.minting,
      bidderAddress,
      amount: (-1n * amount).toString(),
      auctionId: auction.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await this.connection.manager.save(withdrawingBid);

    await this.makeWithdrawalTransfer(withdrawingBid);
  }

  async makeWithdrawalTransfer(withdrawingBid: BidEntity): Promise<void> {
    const auctionKeyring = this.auctionCredentials.keyring;

    const tx = await this.kusamaApi.tx.balances
      .transferKeepAlive(withdrawingBid.bidderAddress, withdrawingBid.amount)
      .signAsync(auctionKeyring);

    await this.extrinsicSubmitter
      .submit(this.kusamaApi, tx)
      .then(async ({ blockNumber }) => {
        await this.bidRepository.update(withdrawingBid.id, {
          status: BidStatus.finished,
          blockNumber: blockNumber.toString(),
        });
      })
      .catch(async (error) => {
        const fullError = {
          method: 'makeWithdrawalTransfer',
          message: error.message,
          withdrawingBid,
        };

        this.logger.error(JSON.stringify(fullError));

        await this.bidRepository.update(withdrawingBid.id, { status: BidStatus.error });
      });
  }

  private async tryCreateWithdrawingBid(args: BidWithdrawArgs): Promise<BidEntity> {
    const { collectionId, tokenId, bidderAddress } = args;

    return this.connection.transaction<BidEntity>(async (transactionEntityManager) => {
      const databaseHelper = new DatabaseHelper(transactionEntityManager);

      const contractAsk = await databaseHelper.getActiveAuctionContract({ collectionId, tokenId });
      const auctionId = contractAsk.auction.id;
      const amount = BigInt(args.amount);

      const currentBidderActualSum = await databaseHelper.getUserActualSum({ auctionId, bidderAddress });

      if (currentBidderActualSum < amount) {
        throw new Error(`You requested ${amount}, but all minted bids sum is ${currentBidderActualSum}`);
      }

      const pendingWinner = await databaseHelper.getAuctionPendingWinner({ auctionId });

      if (pendingWinner && pendingWinner.bidderAddress === bidderAddress) {
        throw new Error(`You are going to be winner, please wait your bid to be overbidden`);
      }

      const actualWinner = await databaseHelper.getAuctionCurrentWinner({ auctionId });

      if (actualWinner && actualWinner.bidderAddress === bidderAddress) {
        throw new Error(`You are winner at this moment, please wait your bid to be overbidden`);
      }

      const withdrawingBid = transactionEntityManager.create(BidEntity, {
        id: uuid(),
        status: BidStatus.minting,
        bidderAddress,
        amount: (-1n * amount).toString(),
        auctionId: contractAsk.auction.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await transactionEntityManager.save(withdrawingBid);

      return withdrawingBid;
    });
  }
}
