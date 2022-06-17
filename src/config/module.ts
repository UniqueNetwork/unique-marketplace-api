import { Module } from '@nestjs/common';
import { configProviders } from './providers';

@Module({
  providers: [...configProviders],
  exports: [...configProviders],
})
export class ConfigModule {}
