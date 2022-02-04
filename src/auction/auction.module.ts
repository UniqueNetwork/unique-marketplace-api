import { Module } from '@nestjs/common';
import { AuctionCreationService } from './services/auction-creation.service';
import { BidPlacingService } from './services/bid-placing.service';
import { AuctionController } from './auction.controller';
import { ScheduleModule } from '@nestjs/schedule';
import { AuctionClosedService } from './services/auction-closed.service';
import { uniqueApiProvider } from './providers/unique-api-provider';
import { ConfigModule } from "../config/module";

@Module({
  imports: [
    ConfigModule,
    ScheduleModule.forRoot()
  ],
  providers: [
    AuctionCreationService,
    BidPlacingService,
    AuctionClosedService,
    uniqueApiProvider,
  ],
  controllers: [AuctionController]
})
export class AuctionModule {}
