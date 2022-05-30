import { Module } from '@nestjs/common';
import { ConfigModule } from 'src/config/module';
import { UniqueAPIProvider } from './providers/unique.provider';

@Module({
  imports: [ConfigModule],
  providers: [UniqueAPIProvider],
  exports: [UniqueAPIProvider],
})
export class PolkadotModule {}
