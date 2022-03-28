import { Pool, PoolConfig } from "pg";
import { parse as parseConnectionString } from 'pg-connection-string';

import { ServerOptions } from 'socket.io';
import { createAdapter } from '@socket.io/postgres-adapter';

import { INestApplicationContext, Logger } from "@nestjs/common";
import { IoAdapter } from '@nestjs/platform-socket.io';
import { Emitter } from "@socket.io/postgres-emitter";
import { MarketConfig } from "../../config/market-config";
import { BroadcastIOEmitter } from "../types";

export class PostgresIoAdapter extends IoAdapter {
  readonly poolConfig: PoolConfig;

  readonly logger = new Logger(PostgresIoAdapter.name);

  constructor(app: INestApplicationContext) {
    super(app);

    const config = app.get<MarketConfig>('CONFIG');

    this.poolConfig = PostgresIoAdapter.buildPoolConfig(config);
  }

  createIOServer(port: number, options?: ServerOptions): any {
    const server = super.createIOServer(port, options);

    const pool = new Pool(this.poolConfig);
    const postgresAdapter = createAdapter(pool);

    server.adapter(postgresAdapter);

    return server;
  }

  static buildPoolConfig({ postgresUrl } : MarketConfig): PoolConfig {
    const connectionOptions = parseConnectionString(postgresUrl);

    return {
      user: connectionOptions.user,
      host: connectionOptions.host,
      database: connectionOptions.database,
      password: connectionOptions.password,
      port: parseInt(connectionOptions.port, 10),
    };
  }

  static createIOEmitter(config: MarketConfig): BroadcastIOEmitter {
    const poolConfig = PostgresIoAdapter.buildPoolConfig(config)
    const pool = new Pool(poolConfig);

    return new Emitter(pool);
  }
}

