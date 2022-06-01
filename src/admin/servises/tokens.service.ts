import { BadRequestException, HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { Connection, getConnection, Repository } from 'typeorm';
import { Collection, Tokens } from '../../entity';
import { ApiPromise } from '@polkadot/api';
import { MarketConfig } from '../../config/market-config';

@Injectable()
export class TokenService {
  private readonly collectionsRepository: Repository<Collection>;
  private readonly tokensRepository: Repository<Tokens>;
  private readonly logger: Logger;

  constructor(
    @Inject('DATABASE_CONNECTION') private db: Connection,
    @Inject('UNIQUE_API') private unique: ApiPromise,
    @Inject('CONFIG') private config: MarketConfig,
  ) {
    this.collectionsRepository = db.getRepository(Collection);
    this.tokensRepository = db.getRepository(Tokens);
    this.logger = new Logger(TokenService.name);
  }

  /**
   * Bulk insert tokens data
   * @param data
   */
  async addTokens(data: any, collection: string): Promise<void> {
    try {
      await this.removeTokenCollection(collection);
      await this.tokensRepository.createQueryBuilder().insert().into(Tokens).values(data).execute();
    } catch (e) {
      throw new BadRequestException({ statusCode: HttpStatus.BAD_REQUEST, message: e.message, error: e.error });
    }
  }

  async removeTokenCollection(collection: string) {
    await this.tokensRepository.createQueryBuilder().delete().from(Tokens).where('collection_id = :collection_id', { collection_id: collection }).execute();
  }

  /**
   * Truncate table tokens
   */
  async truncate(): Promise<void> {
    return await this.tokensRepository.clear();
  }
}
