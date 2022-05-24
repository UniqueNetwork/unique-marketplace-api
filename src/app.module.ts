import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { CommandModule } from 'nestjs-command';
import { TerminusModule } from '@nestjs/terminus';
import { HttpModule } from '@nestjs/axios';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

import { DatabaseModule } from './database/module';
import { ConfigModule } from './config/module';
import { PlaygroundCommand } from './utils/playground';
import { SentryLoggerService } from './utils/sentry/sentry-logger.service';
import { PrometheusService } from './utils/prometheus/prometheus.service';

import { EscrowModule } from './escrow/module';
import { SettingsController, SettingsService } from './settings';
import { OffersController, OffersService } from './offers';
import { TradesController, TradesService } from './trades';
import { HealthController, HealthService } from './utils/health';
import { MetricsController, MetricsService } from './utils/metrics';
import { AuctionModule } from './auction/auction.module';
import { BroadcastModule } from './broadcast/broadcast.module';
import { RequestLoggerMiddleware } from './utils/logging/request-logger-middleware.service';
import { JwtModule } from '@nestjs/jwt';
import { getConfig } from './config';
import { AdminController } from './admin/admin.controller';
import { AdminService } from './admin/admin.service';
const config = getConfig();

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'blockchain'),
      serveRoot:"/blockchain"
    }),
    JwtModule.register({ secret: config.blockchain.escrowSeed }),
    SentryLoggerService(),
    DatabaseModule,
    HttpModule,
    ConfigModule,
    CommandModule,
    EscrowModule,
    TerminusModule,
    AuctionModule,
    BroadcastModule,
  ],
  controllers: [OffersController, TradesController, SettingsController, AdminController, HealthController, MetricsController],
  providers: [OffersService, TradesService, PlaygroundCommand, SettingsService, AdminService, HealthService, MetricsService, PrometheusService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): any {
    consumer.apply(RequestLoggerMiddleware).forRoutes('*');
  }
}
