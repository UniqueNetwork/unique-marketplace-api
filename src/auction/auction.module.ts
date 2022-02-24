import { Module } from '@nestjs/common';
import { AuctionCreationService } from './services/auction-creation.service';
import { BidPlacingService } from './services/bid-placing.service';
import { AuctionController } from './auction.controller';
import { polkadotApiProviders } from './providers/polkadot-api-providers';
import { ConfigModule } from "../config/module";
import { ExtrinsicSubmitter } from "./services/extrinsic-submitter";
import { TxDecoder } from "./services/tx-decoder";

@Module({
  imports: [
    ConfigModule,
  ],
  providers: [
    ExtrinsicSubmitter,
    AuctionCreationService,
    BidPlacingService,
    TxDecoder,
    ...polkadotApiProviders
  ],
  controllers: [AuctionController],
  exports: ['KUSAMA_API', 'UNIQUE_API'],
})
export class AuctionModule {}
