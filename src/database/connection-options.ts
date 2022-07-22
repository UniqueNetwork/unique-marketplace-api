import { ConnectionOptions } from 'typeorm';
import { getConfig } from '../config';
import { ProjectNamingStrategy } from './naming_strategy';

export const getConnectionOptions = (config = getConfig(), test = false, logger = false): ConnectionOptions => {
  return {
    database: '',
    type: 'postgres',
    url: test ? config.testingPostgresUrl : config.postgresUrl,
    entities: [__dirname + '/../**/entity.{t,j}s', __dirname + '/../entity/*.{t,j}s'],
    migrations: [__dirname + '/../migrations/*.{t,j}s'],
    synchronize: false,
    logging: logger ? logger : config.dev.debugMigrations,
    namingStrategy: new ProjectNamingStrategy(),
  };
};

export default getConnectionOptions();
