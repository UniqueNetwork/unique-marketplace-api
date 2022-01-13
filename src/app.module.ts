import { Module } from '@nestjs/common';
import { CommandModule } from 'nestjs-command';

import { DatabaseModule} from './database/module';
import { ConfigModule} from './config/module';
import { OffersController } from './offers/offers.controller';
import { OffersService } from './offers/offers.service';
import { TradesController } from './trades/trades.controller';
import { TradesService } from './trades/trades.service';
import { EscrowModule } from './escrow/module';
import { PlaygroundCommand } from './utils/playground';


@Module({
  imports: [DatabaseModule, ConfigModule, CommandModule, EscrowModule],
  controllers: [OffersController, TradesController],
  providers: [OffersService, TradesService, PlaygroundCommand]
})
export class AppModule {}
