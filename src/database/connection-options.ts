import { ConnectionOptions  } from 'typeorm';

import { getConfig } from "../config";
import { ProjectNamingStrategy } from "./naming_strategy";

export const getConnectionOptions = (config = getConfig()): ConnectionOptions => {
  return {
    type: 'postgres',
    url: config.postgresUrl,
    entities: [__dirname + '/../**/entity.{t,j}s', __dirname + '/../entity/*.{t,j}s'],
    migrations: [__dirname + '/../migrations/*.ts'],
    synchronize: false,
    namingStrategy: new ProjectNamingStrategy(),
  }
}

export default getConnectionOptions();
