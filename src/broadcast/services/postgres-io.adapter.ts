import { Pool, PoolConfig } from "pg";
import { parse as parseConnectionString } from 'pg-connection-string';

import { ServerOptions } from 'socket.io';
import { createAdapter } from '@socket.io/postgres-adapter';

import { INestApplicationContext, Logger } from "@nestjs/common";
import { IoAdapter } from '@nestjs/platform-socket.io';

export class PostgresIoAdapter extends IoAdapter {
  readonly poolConfig: PoolConfig;

  readonly logger = new Logger(PostgresIoAdapter.name);

  constructor(app: INestApplicationContext) {
    super(app);

    const { postgresUrl } = app.get('CONFIG');
    const connectionOptions = parseConnectionString(postgresUrl);

    this.poolConfig = {
      user: connectionOptions.user,
      host: connectionOptions.host,
      database: connectionOptions.database,
      password: connectionOptions.password,
      port: parseInt(connectionOptions.port, 10),
    };
  }

  createIOServer(port: number, options?: ServerOptions): any {
    const server = super.createIOServer(port, options);

    const pool = new Pool(this.poolConfig);
    const postgresAdapter = createAdapter(pool);

    server.adapter(postgresAdapter);

    return server;
  }
}

