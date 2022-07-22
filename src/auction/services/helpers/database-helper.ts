import { Any, EntityManager, In, LessThanOrEqual, MoreThan, SelectQueryBuilder } from 'typeorm';
import { Logger } from '@nestjs/common';
import { AuctionBidEntity, OffersEntity } from '../../../entity';
import { AuctionStatus, BidStatus } from '../../../types';
import { encodeAddress } from '@polkadot/util-crypto';

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

type AuctionTokenFilter = {
  collectionId: number;
  tokenId: number;
};

export class DatabaseHelper {
  private logger = new Logger(DatabaseHelper.name);

  constructor(private readonly entityManager: EntityManager) {}

  async getActiveAuction(filter: AuctionTokenFilter): Promise<OffersEntity> {
    return this.getAuction(filter, [AuctionStatus.active]);
  }

  async getAuction(filter: AuctionTokenFilter, auctionStatuses: AuctionStatus[]): Promise<OffersEntity> {
    const { collectionId, tokenId } = filter;

    const offersEntityData = await this.entityManager.findOne(OffersEntity, {
      where: { type: 'Auction', collection_id: collectionId.toString(), token_id: tokenId.toString(), status_auction: In(auctionStatuses) },
    });
    return offersEntityData;
  }

  async updateAuctionsAsStopped(): Promise<{ auctionIds: string[] }> {
    const auctionIds: string[] = [];

    const auctionsToStop = await this.entityManager.find(OffersEntity, {
      where: {
        status_auction: AuctionStatus.active,
        stopAt: LessThanOrEqual(new Date()),
      },
    });

    auctionsToStop.forEach((a) => {
      auctionIds.push(a.id);
    });

    if (auctionIds.length) {
      await this.entityManager.update(OffersEntity, auctionIds, {
        status_auction: AuctionStatus.stopped,
        stopAt: new Date(),
      });
    }

    return { auctionIds };
  }

  async findAuctionsReadyForWithdraw(): Promise<OffersEntity[]> {
    const mintingBids = this.entityManager
      .createQueryBuilder(AuctionBidEntity, 'bid')
      .select('auction_id')
      .distinct()
      .where('bid.status = :bidStatus');

    return this.entityManager
      .createQueryBuilder(OffersEntity, 'auction')
      .where('type = :type')
      .andWhere('auction.status_auction = :auctionStatus')
      .andWhere(`id NOT IN (${mintingBids.getSql()})`)
      .setParameters({
        type: 'Auction',
        auctionStatus: AuctionStatus.stopped,
        bidStatus: BidStatus.minting,
      })
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
      .createQueryBuilder<AggregatedBidDb>(AuctionBidEntity, 'auction_bid')
      .select('SUM(auction_bid.amount)', 'totalAmount')
      .addSelect('auction_bid.bidder_address', 'bidderAddress')
      .where('auction_bid.auction_id = :auctionId', { auctionId });

    if (bidStatuses) query.andWhere('auction_bid.status = ANY (:bidStatuses)', { bidStatuses });
    if (bidderAddress)
      query.andWhere('auction_bid.bidder_address = :bidderAddress', {
        bidderAddress: encodeAddress(bidderAddress),
      });

    query.groupBy('bidder_address').orderBy('1', 'DESC');

    //this.logger.debug(JSON.stringify(query.getQueryAndParameters()));

    return query;
  }

  async getUserPendingSum(filter: { auctionId: string; bidderAddress: string }): Promise<bigint> {
    const bidsTotal = await this.getAggregatedBid({
      ...filter,
      bidStatuses: [BidStatus.finished, BidStatus.minting],
    });

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

  async getBids(filter: { auctionId: string; bidStatuses?: BidStatus[]; includeWithdrawals?: boolean }): Promise<AuctionBidEntity[]> {
    const { auctionId, includeWithdrawals = false, bidStatuses = [BidStatus.minting, BidStatus.finished] } = filter;
    const amoutData = includeWithdrawals ? { amount: MoreThan(0) } : {};
    // const findOptions: FindManyOptions<AuctionBidEntity> = {
    //   where: {
    //     auctionId: auctionId,
    //     status: In(bidStatuses),
    //     ...amoutData,
    //   },
    // };

    return this.entityManager.find(AuctionBidEntity, {
      where: {
        auctionId: auctionId,
        status: Any(bidStatuses),
        ...amoutData,
      },
    } as any);
  }
}
