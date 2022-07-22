import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { NFTTransferService } from './nft-transfer/nft-transfer.service';

import { NFTTransfer, AccountPairs, MoneyTransfer } from '../entity';
import { ConfigServiceModule } from '../config/module';
import { MoneyTransferService } from './money-transfer/money-transfer.service';

@Module({
  imports: [TypeOrmModule.forFeature([NFTTransfer, AccountPairs, MoneyTransfer]), ConfigServiceModule],
  providers: [NFTTransferService, MoneyTransferService],
  exports: [NFTTransferService, MoneyTransferService],
})
export class DbModule {}
