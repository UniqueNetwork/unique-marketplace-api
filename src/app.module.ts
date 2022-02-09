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
import { HealthController } from './utils/health/health.controller';
import { HealthService } from './utils/health/health.service';
import { PrometheusService } from './utils/prometheus/prometheus.service';
import { TerminusModule } from '@nestjs/terminus';
import { MetricsController } from './utils/metrics/metrics.controller';
import { MetricsService } from './utils/metrics/metrics.service';
import { HttpModule, HttpService } from '@nestjs/axios';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'blockchain'),
    }),
    SentryLoggerService(),
    DatabaseModule,
    HttpModule,
    ConfigModule,
    CommandModule,
    EscrowModule,
    TerminusModule,
  ],
  controllers: [OffersController, TradesController, SettingsController, HealthController, MetricsController],
  providers: [OffersService, TradesService, PlaygroundCommand, SettingsService, HealthService, MetricsService, PrometheusService],
})
export class AppModule {}
