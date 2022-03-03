import { Inject, MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { Response } from 'express';
import { AuctionCreationService } from './services/auction-creation.service';
import { AuctionCancelingService } from './services/auction-canceling.service';
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
import { MarketConfig } from '../config/market-config';

@Module({
  imports: [ConfigModule, ScheduleModule.forRoot()],
  providers: [
    ...polkadotApiProviders,
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
  ],
  controllers: [AuctionController],
  exports: ['KUSAMA_API', 'UNIQUE_API', AuctionClosingScheduler],
})
export class AuctionModule implements NestModule {
  constructor(@Inject('CONFIG') private config: MarketConfig) {}

  configure(consumer: MiddlewareConsumer) {
    if (!this.config.auction.seed) return;

    consumer
      .apply(function (req, res: Response, next) {
        res.append('access-control-allow-headers', 'x-polkadot-signature,x-polkadot-signer');
        next();
      })
      .forRoutes('/auction/');
  }
}
