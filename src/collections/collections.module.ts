import { Module } from '@nestjs/common';
import { CollectionsService } from './collections.service';
import { PolkadotModule } from '../polkadot/polkadot.module';
import { ConfigModule } from 'src/config/module';

@Module({
  imports: [PolkadotModule, ConfigModule],
  providers: [CollectionsService],
  exports: [CollectionsService],
})
export class CollectionsModule {}
