import { Any, EntityManager, LessThanOrEqual, MoreThan, SelectQueryBuilder } from 'typeorm';
import { Logger } from '@nestjs/common';
import { AuctionEntity, BidEntity, OffersEntity } from '../../../entity';
import { ASK_STATUS } from '../../../escrow/constants';
import { AuctionStatus, BidStatus } from '../../../types';
import { FindManyOptions } from 'typeorm/find-options/FindManyOptions';
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

type ContractOfferFilter = {
  collectionId: number;
  tokenId: number;
};

export class DatabaseHelper {
  private logger = new Logger(DatabaseHelper.name);

  constructor(private readonly entityManager: EntityManager) {}

  async getActiveAuctionContract(filter: ContractOfferFilter): Promise<OffersEntity> {
    return this.getAuction(filter, [AuctionStatus.active]);
  }

  async getAuction(filter: ContractOfferFilter, auctionStatuses: AuctionStatus[]): Promise<OffersEntity> {
    const { collectionId, tokenId } = filter;

    const offersEntityData = await this.entityManager.findOne(OffersEntity, {
      where: { type: 'Auction', collection_id: collectionId, token_id: tokenId, action: ASK_STATUS.ACTIVE },
    });

    // // if (!offersEntity) throw new Error('no offer');
    // // if (!offersEntity.auction) throw new Error('no auction');
    //
    // if (!auctionStatuses.includes(OffersEntity.action)) {
    //   throw new Error(`Current auction status is ${OffersEntity.action}`);
    // }
    return offersEntityData;
  }

  async updateAuctionsAsStopped(): Promise<{ contractIds: string[] }> {
    const contractIds: string[] = [];
    const auctionIds: string[] = [];

    const auctionsToStop = await this.entityManager.find(OffersEntity, {
      action: AuctionStatus.active,
      stopAt: LessThanOrEqual(new Date()),
    });

    auctionsToStop.forEach((a) => {
      contractIds.push(a.OffersEntityId);
      auctionIds.push(a.id);
    });

    if (auctionsToStop.length === 0) return { contractIds };

    if (auctionIds.length) {
      await this.entityManager.update(AuctionEntity, auctionIds, {
        status: AuctionStatus.stopped,
        stopAt: new Date(),
      });
    }

    return { contractIds };
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
      .setParameters({
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
      .createQueryBuilder<AggregatedBidDb>(BidEntity, 'auction_bid')
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

  async getBids(filter: { auctionId: string; bidStatuses?: BidStatus[]; includeWithdrawals?: boolean }): Promise<BidEntity[]> {
    const { auctionId, includeWithdrawals = false, bidStatuses = [BidStatus.minting, BidStatus.finished] } = filter;

    const findOptions: FindManyOptions<BidEntity> = {
      where: {
        auctionId,
        status: Any(bidStatuses),
        ...(includeWithdrawals ? { amount: MoreThan(0) } : {}),
      },
    };

    return this.entityManager.find(BidEntity, findOptions);
  }
}
