import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { CommandModule } from 'nestjs-command';
import { TerminusModule } from '@nestjs/terminus';
import { HttpModule } from '@nestjs/axios';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { DatabaseModule } from './database/module';
import { PlaygroundCommand } from './utils/playground';
import { SentryLoggerService } from './utils/sentry/sentry-logger.service';
import { PrometheusService } from './utils/prometheus/prometheus.service';
import { EscrowModule } from './escrow/module';
import { HealthController, HealthService } from './utils/health';
import { MetricsController, MetricsService } from './utils/metrics';
import { AuctionModule } from './auction/auction.module';
import { BroadcastModule } from './broadcast/broadcast.module';
import { RequestLoggerMiddleware } from './utils/logging/request-logger-middleware.service';
import { TradesModule } from './trades/trades.module';
import { OffersModule } from './offers/offers.module';
import { SettingsModule } from './settings/settings.module';
import { AdminModule } from './admin/admin.module';
import { ConfigModule } from '@nestjs/config';
import { ConfigServiceModule } from './config/module';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'blockchain'),
      serveRoot: '/blockchain',
    }),
    SentryLoggerService(),
    DatabaseModule,
    HttpModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ConfigServiceModule,
    CommandModule,
    EscrowModule,
    TerminusModule,
    AuctionModule,
    BroadcastModule,
    TradesModule,
    OffersModule,
    SettingsModule,
    AdminModule,
  ],
  controllers: [HealthController, MetricsController],
  providers: [PlaygroundCommand, HealthService, MetricsService, PrometheusService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): any {
    consumer.apply(RequestLoggerMiddleware).forRoutes('*');
  }
}
