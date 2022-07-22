import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AdminController } from './admin.controller';
import { AdminService, CollectionsService, MassCancelingService, MassSaleService, TokenService } from './services';
import { ConfigServiceModule } from '../config/module';
import { MarketConfig } from '../config/market-config';
import { BlockchainModule } from '../blockchain/blockchain.module';
import { AuctionModule } from '../auction/auction.module';

@Module({
  imports: [
    ConfigServiceModule,
    JwtModule.registerAsync({
      imports: [ConfigServiceModule],
      useFactory: async (config: MarketConfig) => ({
        secret: config.blockchain.escrowSeed,
      }),
      inject: ['CONFIG'],
    }),
    BlockchainModule,
    AuctionModule,
  ],
  controllers: [AdminController],
  providers: [AdminService, CollectionsService, MassSaleService, TokenService, MassCancelingService],
  exports: [AdminService, MassSaleService, MassCancelingService, TokenService],
})
export class AdminModule {}
