import { Module } from '@nestjs/common';
import { CommandModule } from 'nestjs-command';

import { DatabaseModule } from './database/module';
import { ConfigModule } from './config/module';
import { OffersController } from './offers/offers.controller';
import { OffersService } from './offers/offers.service';
import { TradesController } from './trades/trades.controller';
import { TradesService } from './trades/trades.service';
import { EscrowModule } from './escrow/module';
import { PlaygroundCommand } from './utils/playground';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { SettingsController, SettingsService } from './settings';
import { SentryLoggerService } from './utils/sentry/sentry-logger.service';


@Module({
    imports: [
        ServeStaticModule.forRoot({
            rootPath: join(__dirname, '..', 'blockchain'),
        }),
        SentryLoggerService(),
        DatabaseModule,
        ConfigModule,
        CommandModule,
        EscrowModule,
    ],
    controllers: [OffersController, TradesController, SettingsController],
    providers: [OffersService, TradesService, PlaygroundCommand, SettingsService],
})
export class AppModule {}
