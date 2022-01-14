import { INestApplication } from '@nestjs/common';
import { MigrationExecutor } from 'typeorm';

import { initApp, getMigrationsConnection } from './data';

describe('Migrations', () => {
    let app: INestApplication;

    beforeAll(async () => {
        app = await initApp();
        await app.init();
    });

    afterAll(async () => {
        await app.close();
    });

    it('Rollback migrations', async () => {
        const config = app.get('CONFIG');
        const conn = await getMigrationsConnection(config, config.dev.debugMigrations);
        await conn.dropDatabase();
        await conn.runMigrations({ transaction: 'all' });
        const migrationExecutor = new MigrationExecutor(conn);

        for (let _ of await migrationExecutor.getAllMigrations()) {
            await migrationExecutor.undoLastMigration();
        }
        await conn.close();
    });
});
