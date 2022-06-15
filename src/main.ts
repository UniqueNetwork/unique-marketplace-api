import { INestApplication, Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { expressMiddleware as prometheusMiddleware } from 'prometheus-api-metrics';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { yellow, green } from 'cli-color';
import { AppModule } from './app.module';
import { runMigrations } from './database/migrations';
import { ignoreQueryCase, useGlobalPipes } from './utils/application';
import * as fs from 'fs';
import { promises } from 'fs';
import { join } from 'path';
import { PostgresIoAdapter } from './broadcast/services/postgres-io.adapter';
import helmet from 'helmet';

const APP_NAME_PREFIX = 'unique-marketplace-api';
const logger = new Logger('NestApplication');

const initSwagger = (app: INestApplication, config, pkg) => {
  const swaggerConf = new DocumentBuilder()
    .setTitle(config.swagger.title)
    .setDescription(fs.readFileSync('docs/description.md').toString())
    .addBearerAuth()
    .addApiKey(
      {
        type: 'apiKey',
        in: 'header',
        name: 'Authorization',
      },
      'address:signature',
    )
    .setVersion(pkg.version)
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConf);
  SwaggerModule.setup('api/docs/', app, swaggerDocument);
};

let app: INestApplication;

async function bootstrap() {
  app = await NestFactory.create(AppModule, { logger: ['log', 'error', 'warn', 'debug'] });
  const config = app.get('CONFIG');
  const pkg = JSON.parse(await promises.readFile(join('.', 'package.json'), 'utf8'));
  if (config.autoDBMigrations) await runMigrations(config, 'migrations');

  if (config.disableSecurity) {
    // app.use((req, res, next) => {
    //   res.header('Access-Control-Allow-Origin', '*');
    //   res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,PATCH,OPTIONS,HEAD');
    //   res.header('Access-Control-Allow-Headers', 'Content-Type, Accept, Signature, Authorization');
    //   next();
    // });

    app.enableCors({
      allowedHeaders: 'X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept, Observe, Signature, Authorization',
      origin: true,
      credentials: true,
    });
    app.use(helmet());
  }
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

  console.log(pkg.version);

  await app.listen(config.listenPort, () => {
    logger.log(`Nest application listening on port: ${yellow(config.listenPort)} ${green('version:')} ${yellow(pkg.version)}`);
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
