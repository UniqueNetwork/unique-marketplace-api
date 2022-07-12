import { FactoryProvider, Global, Module } from '@nestjs/common';
import { ConfigServiceModule } from '../config/module';
import { getConnectionOptions } from './connection-options';
import { Connection, createConnection } from 'typeorm';

const databaseProvider: FactoryProvider<Promise<Connection>> = {
  provide: 'DATABASE_CONNECTION',
  useFactory: async (config) => {
    const connectionOptions = getConnectionOptions(config);
    return await createConnection(connectionOptions);
  },
  inject: ['CONFIG'],
};

@Global()
@Module({
  imports: [ConfigServiceModule],
  providers: [databaseProvider],
  exports: [databaseProvider],
})
export class DatabaseModule {}
