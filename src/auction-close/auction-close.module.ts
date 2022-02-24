import { AuctionClosedService } from './services/auction-closed.service';
import { BidsService } from './services/bids.service';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule } from './../config/module';
import { Module } from '@nestjs/common';
import { TransferService } from './services/transfer.service';
import { AuctionModule } from 'src/auction/auction.module';

@Module({
  imports:[
    ConfigModule,
    AuctionModule,
    ScheduleModule.forRoot(),
  ],
  providers: [
    TransferService,
    BidsService,
    AuctionClosedService
  ]
})
export class AuctionCloseModule {}
