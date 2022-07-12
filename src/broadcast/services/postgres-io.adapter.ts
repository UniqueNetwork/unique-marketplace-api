import { Pool, PoolConfig } from 'pg';
import { parse as parseConnectionString } from 'pg-connection-string';

import { ServerOptions } from 'socket.io';
import { createAdapter } from '@socket.io/postgres-adapter';

import { INestApplicationContext, Logger } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { Emitter } from '@socket.io/postgres-emitter';
import { MarketConfig } from '../../config/market-config';
import { BroadcastIOEmitter, BroadcastIOServer } from '../types';

export class PostgresIoAdapter extends IoAdapter {
  readonly poolConfig: PoolConfig;

  readonly logger = new Logger(PostgresIoAdapter.name);

  constructor(app: INestApplicationContext) {
    super(app);

    const config = app.get<MarketConfig>('CONFIG');

    this.poolConfig = PostgresIoAdapter.buildPoolConfig(config);
  }

  static createIOEmitter(config: MarketConfig): BroadcastIOEmitter {
    const poolConfig = PostgresIoAdapter.buildPoolConfig(config);
    const pool = new Pool(poolConfig);
    PostgresIoAdapter.checkTable(pool).then(() => new Logger(PostgresIoAdapter.name).debug('table existence checked'));

    return new Emitter(pool);
  }

  private static async checkTable(pool: Pool): Promise<void> {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS socket_io_attachments
      (
        id         bigserial UNIQUE,
        created_at timestamptz DEFAULT NOW(),
        payload    bytea
      );
    `);
  }

  private static buildPoolConfig({ postgresUrl }: MarketConfig): PoolConfig {
    const connectionOptions = parseConnectionString(postgresUrl);

    return {
      user: connectionOptions.user,
      host: connectionOptions.host,
      database: connectionOptions.database,
      password: connectionOptions.password,
      port: parseInt(connectionOptions.port, 10),
    };
  }

  createIOServer(port: number, options?: ServerOptions): BroadcastIOServer {
    const server = super.createIOServer(port, options);

    const pool = new Pool(this.poolConfig);
    PostgresIoAdapter.checkTable(pool).then(() => this.logger.log('table existence checked'));

    const postgresAdapter = createAdapter(pool, { errorHandler: this.logger.error });

    server.adapter(postgresAdapter);

    return server;
  }
}
