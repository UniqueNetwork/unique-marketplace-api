import { Inject, Injectable, Logger } from "@nestjs/common";
import { Auction, AuctionStatus, NewAuction } from "../types";
import { Connection, Repository } from "typeorm";
import { AuctionEntity } from "../entities";
import { BroadcastService } from "../../broadcast/services/broadcast.service";

@Injectable()
export class AuctionCreationService {
  private readonly logger = new Logger(AuctionCreationService.name);

  private readonly auctionRepository: Repository<AuctionEntity>;

  constructor(
    @Inject('DATABASE_CONNECTION') connection: Connection,
    private broadcastService: BroadcastService,
  ) {
    this.auctionRepository = connection.manager.getRepository(AuctionEntity);
  }

  async create(newAuction: NewAuction, nftTransferTransaction: string): Promise<Auction> {
    const auction = await this.auctionRepository.save(
      this.auctionRepository.create({ ...newAuction, currentPrice: newAuction.startPrice })
    );

    await this.applyChainTransaction(nftTransferTransaction);

    auction.status = AuctionStatus.active;
    await this.auctionRepository.save(auction);

    this.broadcastService.sendAuctionStarted(auction);

    return auction;
  }

  // todo - implement
  private async applyChainTransaction(nftTransferTransaction: string): Promise<void> {
    this.logger.log(nftTransferTransaction);
  }
}