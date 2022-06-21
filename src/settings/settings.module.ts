import { Module } from '@nestjs/common';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { ConfigModule } from '../config/module';
import { AuctionModule } from '../auction/auction.module';

@Module({
  imports: [ConfigModule, AuctionModule],
  controllers: [SettingsController],
  providers: [SettingsService],
})
export class SettingsModule {}
