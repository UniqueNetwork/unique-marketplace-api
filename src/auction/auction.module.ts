import { Module } from '@nestjs/common';
import { AuctionCreationService } from './services/auction-creation.service';
import { BidPlacingService } from './services/bid-placing.service';
import { AuctionController } from './auction.controller';
import { ScheduleModule } from '@nestjs/schedule';
import { AuctionClosedService } from './services/auction-closed.service';
import { polkadotApiProviders } from './providers/polkadot-api-providers';
import { ConfigModule } from "../config/module";
import { ExtrinsicSubmitter } from "./services/extrinsic-submitter";

@Module({
  imports: [
    ConfigModule,
    ScheduleModule.forRoot()
  ],
  providers: [
    ExtrinsicSubmitter,
    AuctionCreationService,
    BidPlacingService,
    AuctionClosedService,
    ...polkadotApiProviders,
  ],
  controllers: [AuctionController]
})
export class AuctionModule {}
