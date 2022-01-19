import { createConnection, DefaultNamingStrategy, NamingStrategyInterface, Table } from 'typeorm';

class ProjectNamingStrategy extends DefaultNamingStrategy implements NamingStrategyInterface {
    primaryKeyName(tableOrName: Table | string, columnNames: string[]): string {
        let tableName = tableOrName instanceof Table ? tableOrName.name : tableOrName;
        return `PK_${tableName}`;
    }
}

export const databaseProviders = [
    {
        provide: 'DATABASE_CONNECTION',
        useFactory: async (config) => {
            return await createConnection({
                type: 'postgres',
                url: config.postgresUrl,
                //logging: true,
                entities: [__dirname + '/../**/entity.{t,j}s', __dirname + '/../entity/*.{t,j}s'],
                synchronize: false,
                namingStrategy: new ProjectNamingStrategy(),
            });
        },
        inject: ['CONFIG'],
    },
];
