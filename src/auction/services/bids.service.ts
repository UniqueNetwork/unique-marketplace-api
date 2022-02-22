import { Repository, Connection } from 'typeorm';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { BidEntity } from '../entities';
import { Bid, BidStatus } from '../types';
import { BidInterface } from '../interface/bid.interface';

@Injectable()
export class BidsService {

  private readonly logger = new Logger(BidsService.name);

  private bidRepository: Repository<BidEntity>;

  constructor(
    @Inject('DATABASE_CONNECTION') connection: Connection
  ) {
    this.bidRepository = connection.manager.getRepository(BidEntity);
  }


  async bids(auctionId: string): Promise<BidInterface> {

    const bids  = await this.bidRepository
    .createQueryBuilder('bid')
    .select(['bid.bidderAddress', 'bid.amount', 'bid.status', 'bid.isWithdrawn'])
    .where('bid.auction_id = :auctionId', { auctionId })
    .andWhere('bid.is_withdrawn = :isWithdrawn', { isWithdrawn: false })
    .orderBy('bid.amount')
    .getMany();

    function winer(): Partial<Bid> | null {
      return bids.find(bid => bid.status === BidStatus.winning);
    }

    function lose(): Array<Partial<Bid>>  {
      return bids.filter(bid => bid.status === BidStatus.outbid) || [];
    }

    function minting(): Partial<Bid> | null {
      return bids.find(bid => bid.status ===BidStatus.minting);
    }

    return {
      bids,
      winer,
      lose,
      minting,
    } as BidInterface
  }

}
