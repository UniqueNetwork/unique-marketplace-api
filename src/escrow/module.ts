import { Module } from '@nestjs/common';

import { EscrowCommand } from './command';
import { EscrowService } from './service';
import { ConfigServiceModule } from '../config/module';
import { DbModule } from '../db/db.module';

@Module({
  providers: [EscrowCommand, EscrowService],
  exports: [EscrowCommand, EscrowService],
  imports: [ConfigServiceModule, DbModule],
})
export class EscrowModule {}
