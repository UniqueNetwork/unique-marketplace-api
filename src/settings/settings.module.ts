import { Module } from '@nestjs/common';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { ConfigServiceModule } from '../config/module';
import { BlockchainModule } from '../blockchain/blockchain.module';
import { AllowedListService } from './allowedlist.service';
import { MarketService } from './market.service';
import { MassCancelingService } from '../admin/services';

@Module({
  imports: [ConfigServiceModule, BlockchainModule],
  controllers: [SettingsController],
  providers: [SettingsService, AllowedListService, MarketService, MassCancelingService],
  exports: [SettingsService],
})
export class SettingsModule {}
