import { createConnection } from 'typeorm';
import { getConnectionOptions } from './connection-options';

export const runMigrations = async (config) => {
    const connectionOptions = getConnectionOptions(config, false, config.dev.debugMigrations);
    const connection = await createConnection({ ...connectionOptions, name: 'migrations' });
    await connection.runMigrations();
    await connection.close();
};
