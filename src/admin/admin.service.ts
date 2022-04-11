import { Inject, Injectable, Logger } from '@nestjs/common';
import { Connection } from 'typeorm';
import { InjectSentry, SentryService } from '../utils/sentry';
import { MarketConfig } from '../config/market-config';
import { ApiPromise } from '@polkadot/api';

@Injectable()
export class AdminService {
  private logger: Logger;

  constructor(
    @InjectSentry() private readonly sentryService: SentryService,
    @Inject('DATABASE_CONNECTION') private connection: Connection,
    @Inject('UNIQUE_API') private uniqueApi: ApiPromise,
    @Inject('CONFIG') private config: MarketConfig,
  ) {
    this.logger = new Logger(AdminService.name);
  }

  /**
   * User authorization
   * @param param
   */
  async login(param: {}) {
    return Promise.resolve(undefined);
  }

  /**
   * Refresh authorization token
   * @param param
   */
  async refreshToken(param: {}) {
    return Promise.resolve(undefined);
  }

  /**
   * Create collection
   * @param param
   */
  async createCollection(param: {}) {
    return Promise.resolve(undefined);
  }

  /**
   * Remove collection
   * @param param
   */
  async removeCollection(param: {}) {
    return Promise.resolve(undefined);
  }

  /**
   * Health check
   */
  public get isConnected(): boolean {
    return true;
  }
}
