import { OfferContractAskDto } from './../../offers/dto/offer-dto';
import { BidsService } from './bids.service';
import { ApiPromise } from '@polkadot/api';
import { BroadcastService } from './../../broadcast/services/broadcast.service';
import { Inject, Injectable, Logger, UnprocessableEntityException } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { AuctionEntity, BidEntity } from '../entities';
import { Connection, Repository } from 'typeorm';
import { Auction, AuctionStatus, Bid } from '../types';
import { ContractAsk } from '../../entity';


@Injectable()
export class AuctionClosedService {
  private readonly logger = new Logger(AuctionClosedService.name);

  private readonly auctionRepository: Repository<AuctionEntity>;

  private readonly contractAskRepository: Repository<ContractAsk>;

  constructor(
    @Inject('DATABASE_CONNECTION') connection: Connection,
    @Inject('KUSAMA_API') private kusamaApi: ApiPromise,
    private broadcastService: BroadcastService,
    private bidsService: BidsService,
  ) {
    this.auctionRepository = connection.manager.getRepository(AuctionEntity);
    this.contractAskRepository = connection.manager.getRepository(ContractAsk);
  }

  @Interval(8000)
  async handleInterval() {
    this.logger.debug('closed auction');

    const auctions: Array<Partial<Auction>> = await this.listStops();

    await this.closeBids(auctions);

    await this.closeAuctions(auctions);
  }

  private async closeBids(auctions: Array<Partial<Auction>>): Promise<void> {
    for(const auction of auctions) {
      const bidsAuction = await this.bidsService.bids(auction.id);

      await this.winnerByAuction(bidsAuction.winer());
      await this.sendMoneyBidLose(bidsAuction.lose());
    }
  }

  private async sendMoneyBidLose(listAddress: Array<Partial<Bid>>): Promise<void> {
    this.logger.log(listAddress);
  }

  private async winnerByAuction(winner: Partial<Bid>): Promise<void> {
    this.logger.log(winner);
  }

  private async closeAuctions(auctions: Array<Partial<Auction>>): Promise<void> {
    for(const auction of auctions) {
      await this.auctionClose(auction);
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
    await this.auctionRepository.update({
       id: auction.id,
       status: auction.status
    }, {
      status: AuctionStatus.ended
    });
    const offer = await this.contractAsk(auction);

    await this.broadcastService.sendAuctionClose(offer);

    this.logger.log(JSON.stringify(offer));
  }

  private async contractAsk(auction: Partial<Auction>): Promise<OfferContractAskDto> {
    const offerWithAuction = await this.contractAskRepository
    .createQueryBuilder('contractAsk')
    .where('contractAsk.id = :id', { id: auction.contractAskId })
    .leftJoinAndMapOne(
      'contractAsk.auction',
      AuctionEntity,
      'auction',
      'auction.contract_ask_id = contractAsk.id'
    )
    .leftJoinAndMapMany(
      'auction.bids',
      BidEntity,
      'bid',
      'bid.auction_id = auction.id and bid.is_withdrawn = false',
    )
    .getOne();
    return OfferContractAskDto.fromContractAsk(offerWithAuction);
  }
}
