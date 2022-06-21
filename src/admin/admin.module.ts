import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AdminController } from './admin.controller';
import { AdminService, CollectionsService, MassSaleService, TokenService } from './services';
import { AuctionModule } from '../auction/auction.module';
import { ConfigModule } from '../config/module';
import { MarketConfig } from '../config/market-config';

@Module({
  imports: [
    ConfigModule,
    AuctionModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (config: MarketConfig) => ({
        secret: config.blockchain.escrowSeed,
      }),
      inject: ['CONFIG'],
    }),
  ],
  controllers: [AdminController],
  providers: [AdminService, CollectionsService, MassSaleService, TokenService],
  exports: [AdminService],
})
export class AdminModule {}
