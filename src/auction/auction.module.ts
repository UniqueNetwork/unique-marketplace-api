import { Module } from '@nestjs/common';
import { AuctionCreationService } from './services/auction-creation.service';
import { BidPlacingService } from './services/bid-placing.service';
import { AuctionController } from './auction.controller';

@Module({
  providers: [AuctionCreationService, BidPlacingService],
  controllers: [AuctionController]
})
export class AuctionModule {}
