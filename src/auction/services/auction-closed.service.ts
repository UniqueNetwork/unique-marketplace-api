import { ApiPromise } from '@polkadot/api';
import { BroadcastService } from './../../broadcast/services/broadcast.service';
import { Inject, Injectable, Logger, BadRequestException } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { AuctionEntity, BidEntity } from '../entities';
import { Connection, Repository } from 'typeorm';
import { Auction, AuctionStatus, Bid } from '../types';
import { ContractAsk } from '../../entity';


@Injectable()
export class AuctionClosedService {
  private readonly logger = new Logger(AuctionClosedService.name);

  private readonly auctionRepository: Repository<AuctionEntity>;

  private readonly bidRepository: Repository<BidEntity>;

  private readonly contractAskRepository: Repository<ContractAsk>;

  constructor(
    @Inject('DATABASE_CONNECTION') connection: Connection,
    @Inject('KUSAMA_API') private kusamaApi: ApiPromise,
    private broadcastService: BroadcastService,
  ) {
    this.auctionRepository = connection.manager.getRepository(AuctionEntity)
    this.bidRepository = connection.manager.getRepository(BidEntity);
    this.contractAskRepository = connection.manager.getRepository(ContractAsk);
  }

  @Interval(8000)
  async handleInterval() {
    this.logger.debug('closed auction');

    const auctions: Array<Partial<Auction>> = await this.listStops();

    for(const auction of auctions) {
      //const bids = await this.bids(auction.id);
      const contractAsk = await this.contractAsk(auction);

      this.logger.log(JSON.stringify(contractAsk));
      //await this.auctionClose(auction);
    }
  }

  private async listStops(): Promise<Array<Partial<Auction>>> {
    const auctionEnds: Array<Auction> = await this.auctionRepository
      .createQueryBuilder('auction')
      .select(['auction.id','auction.status','auction.stopAt', 'auction.contractAskId'])
      .where('auction.status <> :status', { status: AuctionStatus.ended })
      .andWhere('auction.stopAt <= :stopAt', {stopAt: new Date()})
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
    this.logger.log(JSON.stringify(results));
  }

  private async contractAsk(auction: Partial<Auction>): Promise<ContractAsk> {
    console.log(auction.contractAskId);
    const offerWithAuction = await this.contractAskRepository.findOne({
      where: {
        id: auction.contractAskId
      },
      relations: ['auction']
    });

    if (offerWithAuction?.auction) {
      return offerWithAuction;
    }

    throw new BadRequestException(`No active auction found for ${JSON.stringify({offerWithAuction})}`)
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
