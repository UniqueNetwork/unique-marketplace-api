import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';

@Injectable()
export class AuctionClosedService {
  private readonly logger = new Logger(AuctionClosedService.name);

  @Interval(60000)
  handleInterval() {
    this.logger.log('checking closed auction');
  }
}
