import { EntityManager, MoreThan } from 'typeorm';
import { BidEntity, ContractAsk } from '../../entity';
import { ASK_STATUS } from '../../escrow/constants';
import { BidStatus } from '../types';
import { FindManyOptions } from 'typeorm/find-options/FindManyOptions';

type BidsTotal = { bidderAddress: string; totalAmount: bigint };

type BidsFilter = {
  auctionId: string;
  bidStatuses?: BidStatus[];
  bidderAddress?: string;
};


export class DatabaseHelper {
  constructor(private readonly transactionEntityManager: EntityManager) {}

  async getContractWithAuction(filter: { collectionId: number; tokenId: number }): Promise<ContractAsk> {
    const { collectionId, tokenId } = filter;

    const contractAsk = await this.transactionEntityManager.findOne(ContractAsk, {
      where: { collection_id: collectionId, token_id: tokenId, status: ASK_STATUS.ACTIVE },
      relations: ['auction'],
    });

    if (!contractAsk) throw new Error('no offer');
    if (!contractAsk.auction) throw new Error('no auction');

    return contractAsk;
  }

  private async getBidsSum(filter: {
    auctionId: string;
    bidStatuses?: BidStatus[];
    bidderAddress?: string;
  }): Promise<BidsTotal | undefined> {
    const { auctionId, bidStatuses, bidderAddress } = filter;

    const query = this.transactionEntityManager
      .createQueryBuilder(BidEntity, 'auction_bid')
      .select('SUM(auction_bid.amount)', 'totalAmount')
      .select('auction_bid.bidder_address)', 'bidderAddress')
      .where('auction_bid.auction_id = :auctionId', { auctionId })

    if (bidStatuses) query.andWhere('auction_bid.status in :bidStatuses', { bidStatuses });
    if (bidderAddress) query.andWhere('auction_bid.bidder_address = :bidderAddress', { bidderAddress });

    const result = await query.groupBy('bidder_address')
      .orderBy('totalAmount', 'DESC')
      .getRawOne<{ bidderAddress: string; totalAmount: string }>();

    if (!result) return undefined;

    return {
      bidderAddress: result.bidderAddress,
      totalAmount: BigInt(result.totalAmount),
    };
  }

  async getUserPendingSum(filter: { auctionId: string; bidderAddress: string }): Promise<bigint> {
    const bidsTotal = await this.getBidsSum({ ...filter, bidStatuses: [BidStatus.finished, BidStatus.minting] });

    return bidsTotal?.totalAmount ?? 0n;
  }

  async getUserActualSum(filter: { auctionId: string; bidderAddress: string }): Promise<bigint> {
    const bidsTotal = await this.getBidsSum({ ...filter, bidStatuses: [BidStatus.finished] });

    return bidsTotal?.totalAmount ?? 0n;
  }

  async getAuctionPendingWinner(filter: Pick<BidsFilter, 'auctionId'>): Promise<BidsTotal | undefined> {
    return this.getBidsSum({ ...filter, bidStatuses: [BidStatus.finished, BidStatus.minting] });
  }

  async getAuctionCurrentWinner(filter: Pick<BidsFilter, 'auctionId'>): Promise<BidsTotal | undefined> {
    return this.getBidsSum({ ...filter, bidStatuses: [BidStatus.finished] });
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

    return this.transactionEntityManager.find(BidEntity, findOptions);
  }
}