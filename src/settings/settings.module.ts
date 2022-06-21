import { Module } from '@nestjs/common';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { ConfigModule } from '../config/module';
import { BlockchainModule } from '../blockchain/blockchain.module';

@Module({
  imports: [ConfigModule, BlockchainModule],
  controllers: [SettingsController],
  providers: [SettingsService],
})
export class SettingsModule {}
