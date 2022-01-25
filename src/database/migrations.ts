import { createConnection } from 'typeorm';

import { ProjectNamingStrategy } from './naming_strategy';
import { activeMigrations } from '../migrations';

export const runMigrations = async (config) => {
    const connection = await createConnection({
        name: 'migrations',
        type: 'postgres',
        url: config.postgresUrl,
        logging: true,
        migrations: activeMigrations,
        namingStrategy: new ProjectNamingStrategy(),
    });
    await connection.runMigrations();
    await connection.close();
};
