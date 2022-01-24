import { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { AppModule } from './app.module';
import { runMigrations } from './database/migrations';
import { ignoreQueryCase, useGlobalPipes } from './utils/application';

const initSwagger = (app: INestApplication, config) => {
  const swaggerConf = new DocumentBuilder().setTitle(config.swagger.title).setDescription(config.swagger.description).setVersion(config.swagger.version).build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConf);
  SwaggerModule.setup('api/docs/', app, swaggerDocument);
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule), config = app.get('CONFIG');

  if(config.autoDBMigrations) await runMigrations(config);

  if(config.disableSecurity) app.enableCors();

  initSwagger(app, config);
  ignoreQueryCase(app);
  useGlobalPipes(app);

  await app.listen(config.listenPort);
}

bootstrap();
