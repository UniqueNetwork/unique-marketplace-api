import { TypeOrmModuleOptions } from '@nestjs/typeorm';

import { join } from 'path';
import { getConfig } from 'src/config';
import { ProjectNamingStrategy } from './naming_strategy';

const dbConfig = getConfig('CONFIG');

const typeOrmConfig: TypeOrmModuleOptions = {
    type: 'postgres',
    url: dbConfig.postgresUrl,
    logging: true,
    entities: [__dirname + '/../**/entity.{t,j}s', __dirname + '/../entity/*.{t,j}s'],
    synchronize: false,
    namingStrategy: new ProjectNamingStrategy(),
    migrationsRun: dbConfig.migrationsRun,
    migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
    cli: {
        migrationsDir: join('src', 'database', 'migrations'),
    },
};

module.exports = typeOrmConfig;
