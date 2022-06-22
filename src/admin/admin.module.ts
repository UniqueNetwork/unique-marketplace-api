import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AdminController } from './admin.controller';
import { AdminService, CollectionsService, MassSaleService, TokenService, MassCancelingService } from './services';
import { ConfigModule } from '../config/module';
import { MarketConfig } from '../config/market-config';
import { BlockchainModule } from '../blockchain/blockchain.module';
import { AuctionModule } from '../auction/auction.module';

@Module({
  imports: [
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
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
  exports: [AdminService],
})
export class AdminModule {}
