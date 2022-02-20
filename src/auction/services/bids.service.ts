import { Repository, Connection } from 'typeorm';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { BidEntity } from '../entities';
import { Bid } from '../types';
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
      if (bids.length === 1) {
        return bids[0];
      } else {
        return null
      }
    }

    function lose(): Array<Partial<Bid>> | [] {
      return bids.slice(1);
    }

    return {
      bids,
      winer,
      lose,
    } as BidInterface
  }

}
