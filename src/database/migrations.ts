import { createConnection } from 'typeorm';
import { getConnectionOptions } from './connection-options';

export const runMigrations = async (config, migrationsName = 'default') => {
  const connectionOptions = getConnectionOptions(config, false, config.dev.debugMigrations);
  const connection = await createConnection({ ...connectionOptions, name: migrationsName });
  await connection.runMigrations({ transaction: 'all' });
  await connection.close();
};
