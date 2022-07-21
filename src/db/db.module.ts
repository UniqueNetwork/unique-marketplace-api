import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { NFTTransferService } from './nft-transfer/nft-transfer.service';

import { NFTTransfer, AccountPairs } from '../entity';
import { ConfigServiceModule } from '../config/module';

@Module({
  imports: [TypeOrmModule.forFeature([NFTTransfer, AccountPairs]), ConfigServiceModule],
  providers: [NFTTransferService],
  exports: [NFTTransferService],
})
export class DbModule {}
