import { Inject, Injectable, Logger } from "@nestjs/common";
import { Connection } from "typeorm";

import { Bid, NewBid } from "../types";
import { BidEntity } from "../entities";

@Injectable()
export class BidPlacingService {
  private readonly logger = new Logger(BidPlacingService.name);

  constructor(
    @Inject('DATABASE_CONNECTION') private connection: Connection,
  ) {}

  async placeBid(newBid: NewBid, balanceTransferTransaction: string): Promise<Bid> {
    const bidRepository = this.connection.manager.getRepository(BidEntity);

    const bid = bidRepository.create(newBid);
    await this.transferBalance(balanceTransferTransaction);

    return await bidRepository.save(bid);
  }

  // todo - implement
  private async transferBalance(balanceTransferTransaction: string): Promise<void> {
    this.logger.debug(balanceTransferTransaction);
  }
}