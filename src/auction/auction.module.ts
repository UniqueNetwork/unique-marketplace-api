import { Module } from '@nestjs/common';
import { AuctionCreationService } from './services/auction-creation.service';
import { AuctionCancellingService } from './services/auction-cancelling.service';
import { BidPlacingService } from './services/bid-placing.service';
import { BidWithdrawService } from './services/bid-withdraw.service';
import { AuctionController } from './auction.controller';
import { auctionCredentialsProvider, polkadotApiProviders } from './providers';
import { ConfigModule } from '../config/module';
import { ExtrinsicSubmitter } from './services/helpers/extrinsic-submitter';
import { TxDecoder } from './services/helpers/tx-decoder';
import { SignatureVerifier } from './services/helpers/signature-verifier';
import { AuctionClosingScheduler } from './services/closing/auction-closing.scheduler';
import { ScheduleModule } from '@nestjs/schedule';
import { AuctionClosingService } from './services/closing/auction-closing.service';
import { ForceClosingService } from './services/closing/force-closing.service';

@Module({
  imports: [ConfigModule, ScheduleModule.forRoot()],
  providers: [
    ...polkadotApiProviders,
    auctionCredentialsProvider,
    ExtrinsicSubmitter,
    TxDecoder,
    SignatureVerifier,
    AuctionCreationService,
    AuctionCancellingService,
    BidPlacingService,
    BidWithdrawService,
    AuctionClosingService,
    AuctionClosingScheduler,
    ForceClosingService,
  ],
  controllers: [AuctionController],
  exports: ['KUSAMA_API', 'UNIQUE_API', AuctionClosingScheduler],
})
export class AuctionModule {}
