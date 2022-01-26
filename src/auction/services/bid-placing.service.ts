import { Inject, Injectable, Logger } from "@nestjs/common";
import { Connection, Repository } from "typeorm";

import { Bid, NewBid } from "../types";
import { BidEntity } from "../entities";
import { BroadcastService } from "../../broadcast/services/broadcast.service";

@Injectable()
export class BidPlacingService {
  private readonly logger = new Logger(BidPlacingService.name);

  private bidRepository: Repository<BidEntity>;

  constructor(
    @Inject('DATABASE_CONNECTION') connection: Connection,
    private broadcastService: BroadcastService,
  ) {
    this.bidRepository = connection.manager.getRepository(BidEntity);
  }

  async placeBid(newBid: NewBid, balanceTransferTransaction: string): Promise<Bid> {
    let bid = this.bidRepository.create(newBid);

    await this.transferBalance(balanceTransferTransaction);

    bid = await this.bidRepository.save(bid);

    this.broadcastService.sendBidPlaced(bid);

    return bid;
  }

  // todo - implement
  private async transferBalance(balanceTransferTransaction: string): Promise<void> {
    this.logger.debug(balanceTransferTransaction);
  }
}