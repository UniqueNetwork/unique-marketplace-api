import { INestApplication, Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { expressMiddleware as prometheusMiddleware } from 'prometheus-api-metrics';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { yellow } from 'cli-color';
import { AppModule } from './app.module';
import { runMigrations } from './database/migrations';
import { ignoreQueryCase, useGlobalPipes } from './utils/application';
import * as fs from 'fs';
import { promises } from 'fs';
import { join } from 'path';
import { PostgresIoAdapter } from "./broadcast/services/postgres-io.adapter";

const APP_NAME_PREFIX = 'unique-marketplace-api';
const logger = new Logger('NestApplication');

const initSwagger = (app: INestApplication, config, pkg) => {
  const swaggerConf = new DocumentBuilder()
    .setTitle(config.swagger.title)
    .setDescription(fs.readFileSync('docs/description.md').toString())
    .setVersion(pkg.version)
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConf);
  SwaggerModule.setup('api/docs/', app, swaggerDocument);
};

let app: INestApplication;

async function bootstrap() {
  app = await NestFactory.create(AppModule,{logger: ['log', 'error', 'warn','debug']});
  const config = app.get('CONFIG');
  const pkg = JSON.parse(
    await promises.readFile(join('.', 'package.json'), 'utf8'),
  );
  if (config.autoDBMigrations) await runMigrations(config, 'migrations');

  if (config.disableSecurity) app.enableCors();

  app.use(
    prometheusMiddleware({
      additionalLabels: ['app'],
      extractAdditionalLabelValuesFn: () => ({ app: APP_NAME_PREFIX }),
    }),
  );

  app.useGlobalPipes(new ValidationPipe());
  app.setGlobalPrefix('api');
  app.enableShutdownHooks();
  app.useWebSocketAdapter(new PostgresIoAdapter(app));

  initSwagger(app, config, pkg);
  ignoreQueryCase(app);
  useGlobalPipes(app);

  await app.listen(config.listenPort, () => {
    logger.log(`Nest application listening on port: ${yellow(config.listenPort)}`);
  });
}

bootstrap().catch((error: unknown) => {
  logger.error('Bootstrapping application failed! ' + error);
});

async function gracefulShutdown(): Promise<void> {
  if (app !== undefined) {
    await app.close();
    logger.warn('Application closed!');
  }
  process.exit(0);
}

process.once('SIGTERM', async () => {
  logger.warn('SIGTERM: Graceful shutdown... ');
  await gracefulShutdown();
});

process.once('SIGINT', async () => {
  logger.warn('SIGINT: Graceful shutdown... ');
  await gracefulShutdown();
});
