import { ConnectionOptions } from 'typeorm';

import { getConfig } from '../config';
import { ProjectNamingStrategy } from './naming_strategy';
import { join } from 'path';
import { DataSourceOptions } from 'typeorm/data-source/DataSourceOptions';
import { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';

export const getConnectionOptions = (config = getConfig(), test = false, logger = false): DataSourceOptions => {
  return {
    database: '',
    type: 'postgres',
    url: test ? config.testingPostgresUrl : config.postgresUrl,
    entities: [__dirname + '/../**/entity.{t,j}s', __dirname + '/../entity/*.{t,j}s'],
    migrations: [__dirname + '/../migrations/*.{t,j}s'],
    synchronize: false,
    logging: logger ? logger : config.dev.debugMigrations,
    // @ts-ignore
    cli: {
      migrationsDir: join('src', 'migrations'),
    },
    namingStrategy: new ProjectNamingStrategy(),
  };
};

export default getConnectionOptions();
