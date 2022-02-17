import { TransferService } from './services/transfer.service';
import { Module } from '@nestjs/common';
import { AuctionCreationService } from './services/auction-creation.service';
import { BidPlacingService } from './services/bid-placing.service';
import { AuctionController } from './auction.controller';
import { ScheduleModule } from '@nestjs/schedule';
import { AuctionClosedService } from './services/auction-closed.service';
import { polkadotApiProviders } from './providers/polkadot-api-providers';
import { ConfigModule } from "../config/module";
import { ExtrinsicSubmitter } from "./services/extrinsic-submitter";
import { TxDecoder } from "./services/tx-decoder";
import { BidsService } from './services/bids.service';

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
    TxDecoder,
    ...polkadotApiProviders,
    BidsService,
    TransferService
  ],
  controllers: [AuctionController],
  exports: ['KUSAMA_API', 'UNIQUE_API'],
})
export class AuctionModule {}
