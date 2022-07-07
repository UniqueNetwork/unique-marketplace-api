import { Module } from '@nestjs/common';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { ConfigModule } from '../config/module';
import { BlockchainModule } from '../blockchain/blockchain.module';
import { AllowedListService } from './allowedlist.service';

@Module({
  imports: [ConfigModule, BlockchainModule],
  controllers: [SettingsController],
  providers: [SettingsService, AllowedListService],
})
export class SettingsModule {}
