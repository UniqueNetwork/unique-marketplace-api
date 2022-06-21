import { SearchIndexController } from './search-index.controller';
import { Module } from '@nestjs/common';
import { AuctionCreationService } from './services/auction-creation.service';
import { AuctionCancelingService } from './services/auction-canceling.service';
import { BidPlacingService } from './services/bid-placing.service';
import { BidWithdrawService } from './services/bid-withdraw.service';
import { AuctionController } from './auction.controller';
import { AuctionForceCloseController } from './auction-force-close.controller';
import { auctionCredentialsProvider } from './providers';
import { ConfigModule } from '../config/module';
import { ExtrinsicSubmitter } from './services/helpers/extrinsic-submitter';
import { TxDecoder } from './services/helpers/tx-decoder';
import { SignatureVerifier } from './services/helpers/signature-verifier';
import { AuctionClosingScheduler } from './services/closing/auction-closing.scheduler';
import { ScheduleModule } from '@nestjs/schedule';
import { AuctionClosingService } from './services/closing/auction-closing.service';
import { ForceClosingService } from './services/closing/force-closing.service';
import { SearchIndexService } from './services/search-index.service';
import { BlockchainModule } from '../blockchain/blockchain.module';

const isAuctionTestingStage = process.env.IS_AUCTION_TESTING_STAGE === 'true' || process.env.NODE_ENV === 'test';

@Module({
  imports: [ConfigModule, ScheduleModule.forRoot(), BlockchainModule],
  providers: [
    auctionCredentialsProvider,
    ExtrinsicSubmitter,
    TxDecoder,
    SignatureVerifier,
    AuctionCreationService,
    AuctionCancelingService,
    BidPlacingService,
    BidWithdrawService,
    AuctionClosingService,
    AuctionClosingScheduler,
    ForceClosingService,
    SearchIndexService,
  ],
  controllers: [AuctionController, SearchIndexController, ...(isAuctionTestingStage ? [AuctionForceCloseController] : [])],
  exports: [AuctionClosingScheduler, SearchIndexService, AuctionCreationService, SignatureVerifier],
})
export class AuctionModule {}
