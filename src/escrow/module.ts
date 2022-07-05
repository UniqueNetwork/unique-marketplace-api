import { Module } from '@nestjs/common';
import { EscrowCommand } from './command';
import { EscrowService } from './service';
import { DatabaseModule } from '../database/module';
import { ConfigModule } from '../config/module';

@Module({
  providers: [EscrowCommand, EscrowService],
  exports: [EscrowCommand, EscrowService],
  imports: [DatabaseModule, ConfigModule],
})
export class EscrowModule {}
