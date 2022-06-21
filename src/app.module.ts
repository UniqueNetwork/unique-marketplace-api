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
import { HealthController, HealthService } from './utils/health';
import { MetricsController, MetricsService } from './utils/metrics';
import { AuctionModule } from './auction/auction.module';
import { BroadcastModule } from './broadcast/broadcast.module';
import { RequestLoggerMiddleware } from './utils/logging/request-logger-middleware.service';
import { JwtModule } from '@nestjs/jwt';
import { getConfig } from './config';
import { SignatureVerifier } from './auction/services/helpers/signature-verifier';
import { AdminService } from './admin/admin.service';
import { AdminController } from './admin/admin.controller';
import { CollectionsService, TokenService, MassSaleService } from './admin/servises';
import { TradesModule } from './trades/trades.module';
import { OffersModule } from './offers/offers.module';
import { SettingsModule } from './settings/settings.module';

const config = getConfig();

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'blockchain'),
      serveRoot: '/blockchain',
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
    TradesModule,
    OffersModule,
    SettingsModule,
  ],
  controllers: [AdminController, HealthController, MetricsController],
  providers: [
    PlaygroundCommand,
    AdminService,
    SignatureVerifier,
    HealthService,
    MetricsService,
    PrometheusService,
    CollectionsService,
    TokenService,
    MassSaleService,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): any {
    consumer.apply(RequestLoggerMiddleware).forRoutes('*');
  }
}
