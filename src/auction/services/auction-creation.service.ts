import {Inject, Injectable, Logger} from "@nestjs/common";
import {Auction, AuctionStatus, NewAuction} from "../types";
import {Connection} from "typeorm";
import {AuctionEntity} from "../entities";

@Injectable()
export class AuctionCreationService {
  private readonly logger = new Logger(AuctionCreationService.name);

  constructor(
    @Inject('DATABASE_CONNECTION') private connection: Connection,
  ) {}

  async create(newAuction: NewAuction, nftTransferTransaction: string): Promise<Auction> {
    const auctionRepository = this.connection.manager.getRepository(AuctionEntity);

    const auction = await auctionRepository.create(newAuction);

    await auctionRepository.save(auction);
    await this.applyChainTransaction(nftTransferTransaction);

    auction.status = AuctionStatus.active;

    return await auctionRepository.save(auction);
  }

  // todo - implement
  private async applyChainTransaction(nftTransferTransaction: string): Promise<void> {
    this.logger.log(nftTransferTransaction);
  }
}