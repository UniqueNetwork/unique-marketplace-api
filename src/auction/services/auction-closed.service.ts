import { BroadcastService } from './../../broadcast/services/broadcast.service';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { AuctionEntity, BidEntity } from '../entities';
import { Connection, Repository } from 'typeorm';
import { Auction, AuctionStatus, Bid } from '../types';


@Injectable()
export class AuctionClosedService {
  private readonly logger = new Logger(AuctionClosedService.name);

  private readonly auctionRepository: Repository<AuctionEntity>;

  private readonly bidRepository: Repository<BidEntity>;

  constructor(
    @Inject('DATABASE_CONNECTION') connection: Connection,
    private broadcastService: BroadcastService,
  ) {
    this.auctionRepository = connection.manager.getRepository(AuctionEntity)
    this.bidRepository = connection.manager.getRepository(BidEntity);
  }

  @Interval(8000)
  async handleInterval() {
    this.logger.debug('closed auction');

    const auctions: Array<Partial<Auction>> = await this.listStops();

    for(const auction of auctions) {
      const bids = await this.bids(auction.id);

      await this.auctionClose(auction);
    }
  }

  private async listStops(): Promise<Array<Partial<Auction>>> {
    const auctionEnds: Array<Auction> = await this.auctionRepository
      .createQueryBuilder('auction')
      .select(['auction.id','auction.status','auction.stopAt'])
      .where('auction.status <> :status', { status: AuctionStatus.ended })
      .getMany();

    return auctionEnds;
  }

  private async auctionClose(auction: Partial<Auction>): Promise<void> {
    const results = await this.auctionRepository.update({
       id: auction.id,
       status: auction.status
    }, {
      status: AuctionStatus.ended
    });

    this.logger.debug(JSON.stringify(results));
  }


  private async bids(auctionId: string): Promise<Array<Partial<Bid>>> {

    const bids  = await this.bidRepository
      .createQueryBuilder('bid')
      .select(['bid.bidderAddress', 'bid.amount', 'bid.status', 'bid.isWithdrawn'])
      .where('bid.auction_id = :auctionId', { auctionId })
      .andWhere('bid.is_withdrawn = :isWithdrawn', { isWithdrawn: false })
      .getMany();

    return bids;
  }
}
