import { BroadcastService } from './../../broadcast/services/broadcast.service';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { AuctionEntity, BidEntity } from '../entities';
import { Connection, createQueryBuilder, Repository } from 'typeorm';
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

    const auctions: Array<Auction> = await this.listStops();

    for(const auction of auctions) {
      console.log(auction.id);
    }

    await this.bids();

  }

  async listStops(): Promise<Array<Auction>> {
    const auctionEnds: Array<Auction> = await this.auctionRepository
      .createQueryBuilder('auction')
      .select(['auction.id','auction.status','auction.stopAt'])
      .where('auction.status <> :status', { status: AuctionStatus.ended })
      .getMany();

    return auctionEnds;
  }

  async bids(): Promise<Array<Bid>> {

    const bids  = await this.bidRepository
      .createQueryBuilder('bid')
      //.select(['bid.bidder_address', 'bid.amount', 'bid.status', 'bid.is_withdrawn'])
      //.where('bid.auction_id = :auctionId', { auctionId })
      .getMany();

    console.log(bids);

    return [];
  }
}
