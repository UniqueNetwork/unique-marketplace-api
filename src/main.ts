import { INestApplication, Logger, ShutdownSignal } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { AppModule } from './app.module';
import { runMigrations } from './database/migrations';
import { ignoreQueryCase, useGlobalPipes } from './utils/application';
import * as fs from 'fs';

const logger = new Logger('NestApplication');

const initSwagger = (app: INestApplication, config) => {
    const swaggerConf = new DocumentBuilder()
        .setTitle(config.swagger.title)
        .setDescription(fs.readFileSync('docs/description.md').toString())
        .setVersion(config.swagger.version)
        .build();
    const swaggerDocument = SwaggerModule.createDocument(app, swaggerConf);
    SwaggerModule.setup('api/docs/', app, swaggerDocument);
};

let app: INestApplication;

async function bootstrap() {
    app = await NestFactory.create(AppModule);
    const config = app.get('CONFIG');

    if (config.autoDBMigrations) await runMigrations(config);

    if (config.disableSecurity) app.enableCors();

    initSwagger(app, config);
    ignoreQueryCase(app);
    useGlobalPipes(app);

    app.enableShutdownHooks();

    await app.listen(config.listenPort, () => {
        logger.log(`Nest application listening on port: ${config.listenPort}`);
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
    logger.error('SIGTERM: Graceful shutdown... ');
    await gracefulShutdown();
});

process.once('SIGINT', async () => {
    logger.error('SIGINT: Graceful shutdown... ');
    await gracefulShutdown();
});
