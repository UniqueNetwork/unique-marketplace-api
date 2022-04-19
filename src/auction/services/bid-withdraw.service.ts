import { BadRequestException, HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
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
import { encodeAddress } from '@polkadot/util-crypto';
import { BidsWitdrawByOwner } from '../responses';
import { OwnerWithdrawBids } from '../requests/withdraw-bid';
import { InjectSentry, SentryService } from 'src/utils/sentry';

type BidWithdrawArgs = {
  collectionId: number;
  tokenId: number;
  bidderAddress: string;
};

type BidsWirthdrawArgs = {
  bidderAddress: string;
  auctionIds: Array<string>
}

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
    @InjectSentry() private readonly sentryService: SentryService,
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
      bidderAddress: encodeAddress(bidderAddress),
      amount: (-1n * amount).toString(),
      balance: '0',
      auctionId: auction.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await this.connection.manager.save(withdrawingBid);

    await this.makeWithdrawalTransfer(withdrawingBid);
  }

  async makeWithdrawalTransfer(withdrawingBid: BidEntity): Promise<void> {
    const auctionKeyring = this.auctionCredentials.keyring;
    const amount = BigInt(withdrawingBid.amount) * -1n


    const tx = await this.kusamaApi.tx.balances
      .transferKeepAlive(withdrawingBid.bidderAddress, amount)
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

  // todo - unite into single method with withdrawByMarket?
  private async tryCreateWithdrawingBid(args: BidWithdrawArgs): Promise<BidEntity> {
    const { collectionId, tokenId, bidderAddress } = args;

    return this.connection.transaction<BidEntity>('REPEATABLE READ', async (transactionEntityManager) => {
      const databaseHelper = new DatabaseHelper(transactionEntityManager);

      const contractAsk = await databaseHelper.getActiveAuctionContract({ collectionId, tokenId });
      const auctionId = contractAsk.auction.id;

      const bidderActualSum = await databaseHelper.getUserActualSum({ auctionId, bidderAddress });
      const bidderPendingSum = await databaseHelper.getUserPendingSum({ auctionId, bidderAddress });

      if (bidderActualSum <= 0) {
        throw new Error(`Failed to create withdrawal, all minted bids sum is ${bidderActualSum} for ${bidderAddress}`);
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
        bidderAddress: encodeAddress(bidderAddress),
        amount: (-1n * bidderActualSum).toString(),
        balance: (bidderPendingSum - bidderActualSum).toString(),
        auctionId: contractAsk.auction.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await transactionEntityManager.save(withdrawingBid);

      return withdrawingBid;
    });
  }

  async getBidsForWithdraw(owner: string): Promise<Array<BidsWitdrawByOwner>> {
    let results = [];
    try {
      results = await this.connection.manager.query(
        `
        with my_list_auction as (
          select auction_id from bids where bidder_address = $1
          group by auction_id
      ),
      sum_amount_auctions as (
          select distinct b.auction_id, bidder_address, sum(amount) over (partition by bidder_address, b.auction_id) sum_amount
          from bids b inner join  my_list_auction my on my.auction_id = b.auction_id
      ),
      my_withdraws as (
          select auction_id, bidder_address, sum_amount amount, rank() over (partition by auction_id order by sum_amount desc ) rank
          from sum_amount_auctions
      )
      select distinct  auction_id "auctionId", amount, contract_ask_id "contractAskId", collection_id "collectionId", token_id "tokenId" from my_withdraws
      inner join auctions auc on auc.id = auction_id
      inner join contract_ask ca on ca.id = auc.contract_ask_id
      where rank <> 1 and amount > 0 and bidder_address = $1
        `, [owner]
      )
    } catch (e) {
      this.logger.error(e);
      this.sentryService.instance().captureException(new BadRequestException(e), {
        tags: { section: 'get_bids_withdraw' }
      });
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Bad query',
        error: e.message
      })
    }
    return results;
  }

  async withdrawBidsByBidder(args: BidsWirthdrawArgs): Promise<void> {
    const query = this.connection.createQueryBuilder(ContractAsk, 'contract_ask')
      .select(['collection_id', 'token_id'])
      .distinct()
      .innerJoin(
        (subQuery => {
          return subQuery.from(AuctionEntity, 'auc')
          .where('auc.id in (:...auctionIds)', {auctionIds: args.auctionIds})
        })
        , 'auc', 'auc.contract_ask_id = contract_ask.id');

    for (const item of await query.execute()) {
      await this.withdrawBidByBidder({
        bidderAddress: args.bidderAddress,
        collectionId: item.collection_id,
        tokenId: item.token_id
      })
    }
  }
}
