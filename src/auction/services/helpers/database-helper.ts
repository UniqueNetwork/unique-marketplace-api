import {EntityManager, MoreThan, MoreThanOrEqual, SelectQueryBuilder} from 'typeorm';
import { AuctionEntity, BidEntity, ContractAsk } from '../../../entity';
import { ASK_STATUS } from '../../../escrow/constants';
import { AuctionStatus, BidStatus } from '../../types';
import { FindManyOptions } from 'typeorm/find-options/FindManyOptions';

type AggregatedBid = { bidderAddress: string; totalAmount: bigint };
type AggregatedBidDb = { bidderAddress: string; totalAmount: string };

const toAggregatedBid = (input: AggregatedBidDb): AggregatedBid => ({
  bidderAddress: input.bidderAddress,
  totalAmount: BigInt(input.totalAmount),
});

type BidsFilter = {
  auctionId: string;
  bidStatuses?: BidStatus[];
  bidderAddress?: string;
};

type ContractFilter = {
  collectionId: number;
  tokenId: number;
}

export class DatabaseHelper {
  constructor(private readonly entityManager: EntityManager) {}

  async getActiveAuctionContract(filter: ContractFilter): Promise<ContractAsk> {
    const { collectionId, tokenId } = filter;

    const contractAsk = await this.entityManager.findOne(ContractAsk, {
      where: { collection_id: collectionId, token_id: tokenId, status: ASK_STATUS.ACTIVE },
      relations: ['auction'],
    });

    if (!contractAsk) throw new Error('no offer');
    if (!contractAsk.auction) throw new Error('no auction');

    if (contractAsk.auction.status !== AuctionStatus.active) {
      throw new Error(`Current auction status is ${contractAsk.auction.status}`);
    }

    return contractAsk;
  }

  async updateAuctionsAsClosing(): Promise<void> {
    await this.entityManager.update(
      AuctionEntity,
      {
        where: {
          status: AuctionStatus.active,
          stopAt: MoreThanOrEqual(new Date()),
        }
      },
      {
        status: AuctionStatus.stopped,
      },
    );
  }

  async findAuctionsReadyForWithdraw(): Promise<AuctionEntity[]> {
    const mintingBids = this.entityManager
      .createQueryBuilder(BidEntity, 'bid')
      .select('auction_id')
      .distinct()
      .where('bid.status = :bidStatus');

    return this.entityManager
      .createQueryBuilder(AuctionEntity, 'auction')
      .where('auction.status = :auctionStatus')
      .andWhere(`auction.id NOT IN (${mintingBids.getSql()})`)
      .setParameters({ auctionStatus: AuctionStatus.stopped, bidStatus: BidStatus.minting })
      .getMany();
  }

  private async getAggregatedBid(filter: {
    auctionId: string;
    bidStatuses?: BidStatus[];
    bidderAddress?: string;
  }): Promise<AggregatedBid | undefined> {
    const result = await this.buildGroupedBidsQuery(filter).getRawOne<AggregatedBidDb>();

    return result ? toAggregatedBid(result) : undefined;
  }

  async getAuctionAggregatedBids(filter: BidsFilter): Promise<AggregatedBid[]> {
    const result = await this.buildGroupedBidsQuery(filter).getRawMany<AggregatedBidDb>();

    return result.map(toAggregatedBid);
  }

  private buildGroupedBidsQuery(filter: {
    auctionId: string;
    bidStatuses?: BidStatus[];
    bidderAddress?: string;
  }): SelectQueryBuilder<AggregatedBidDb> {
    const { auctionId, bidStatuses, bidderAddress } = filter;

    const query = this.entityManager
      .createQueryBuilder<AggregatedBidDb>(BidEntity, 'auction_bid')
      .select('SUM(auction_bid.amount)', 'totalAmount')
      .select('auction_bid.bidder_address)', 'bidderAddress')
      .where('auction_bid.auction_id = :auctionId', { auctionId });

    if (bidStatuses) query.andWhere('auction_bid.status in :bidStatuses', { bidStatuses });
    if (bidderAddress) query.andWhere('auction_bid.bidder_address = :bidderAddress', { bidderAddress });

    query
      .groupBy('bidder_address')
      .orderBy('totalAmount', 'DESC');

    return query;
  }


  async getUserPendingSum(filter: { auctionId: string; bidderAddress: string }): Promise<bigint> {
    const bidsTotal = await this.getAggregatedBid({ ...filter, bidStatuses: [BidStatus.finished, BidStatus.minting] });

    return bidsTotal?.totalAmount ?? 0n;
  }

  async getUserActualSum(filter: { auctionId: string; bidderAddress: string }): Promise<bigint> {
    const bidsTotal = await this.getAggregatedBid({ ...filter, bidStatuses: [BidStatus.finished] });

    return bidsTotal?.totalAmount ?? 0n;
  }

  async getAuctionPendingWinner(filter: Pick<BidsFilter, 'auctionId'>): Promise<AggregatedBid | undefined> {
    return this.getAggregatedBid({ ...filter, bidStatuses: [BidStatus.finished, BidStatus.minting] });
  }

  async getAuctionCurrentWinner(filter: Pick<BidsFilter, 'auctionId'>): Promise<AggregatedBid | undefined> {
    return this.getAggregatedBid({ ...filter, bidStatuses: [BidStatus.finished] });
  }

  async getBids(filter: { auctionId: string; bidStatuses?: BidStatus[]; includeWithdrawals?: boolean }): Promise<BidEntity[]> {
    const { auctionId, includeWithdrawals = false, bidStatuses = [BidStatus.minting, BidStatus.finished] } = filter;

    const findOptions: FindManyOptions<BidEntity> = {
      where: {
        auctionId,
        status: bidStatuses,
        ...(includeWithdrawals ? { amount: MoreThan(0) } : {}),
      },
    };

    return this.entityManager.find(BidEntity, findOptions);
  }
}