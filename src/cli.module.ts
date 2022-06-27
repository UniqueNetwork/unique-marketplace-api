import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { CommandModule } from 'nestjs-command';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

import { DatabaseModule } from './database/module';
import { ConfigModule } from './config/module';
import { PlaygroundCommand } from './utils/playground';
import { SentryLoggerService } from './utils/sentry/sentry-logger.service';

import { EscrowModule } from './escrow/module';
import { RequestLoggerMiddleware } from './utils/logging/request-logger-middleware.service';
import { CollectionCommandService } from './commands/services/collection.service';
import { CheckConfigCommandService } from './commands/services/check-config.service';
import { CliCommands } from './commands/cli.command';
import { DeployContractService } from './commands/services/deploy-contract.service';

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
  controllers: [],
  providers: [PlaygroundCommand, CliCommands, CollectionCommandService, CheckConfigCommandService, DeployContractService],
})
export class CLIModule implements NestModule {
  configure(consumer: MiddlewareConsumer): any {
    consumer.apply(RequestLoggerMiddleware).forRoutes('*');
  }
}
