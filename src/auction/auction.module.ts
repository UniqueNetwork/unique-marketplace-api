import {DynamicModule, Module, ModuleMetadata, Provider} from '@nestjs/common';
import { AuctionCreationService } from './services/auction-creation.service';
import { AuctionCancellingService } from './services/auction-cancelling.service';
import { BidPlacingService } from './services/bid-placing.service';
import { BidWithdrawService } from "./services/bid-withdraw.service";
import { AuctionController } from './auction.controller';
import { polkadotApiProviders } from './providers/polkadot-api-providers';
import { ConfigModule } from "../config/module";
import { ExtrinsicSubmitter } from "./services/extrinsic-submitter";
import { TxDecoder } from "./services/tx-decoder";
import { SignatureVerifier } from './services/signature-verifier';
import {AuctionClosingScheduler} from "./services/auction-closing.scheduler";


const defaultMetadata: ModuleMetadata = {
  imports: [
    ConfigModule,
  ],
  providers: [
    ExtrinsicSubmitter,
    AuctionCreationService,
    AuctionCancellingService,
    BidPlacingService,
    BidWithdrawService,
    TxDecoder,
    SignatureVerifier,
    ...polkadotApiProviders
  ],
  exports: ['KUSAMA_API', 'UNIQUE_API'],
};

export class AuctionModule {
  static forApiNode(): DynamicModule {
    return {
      module: AuctionModule,
      ...defaultMetadata,
      controllers: [AuctionController],
    }
  }

  static forExcrowNode(): DynamicModule {
    return {
      module: AuctionModule,
      ...defaultMetadata,
      providers: [...defaultMetadata.providers, AuctionClosingScheduler],
    }
  }
}
