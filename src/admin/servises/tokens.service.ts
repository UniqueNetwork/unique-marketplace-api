import { BadRequestException, HttpStatus, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Connection, Repository } from 'typeorm';
import { Collection, Tokens } from '../../entity';
import { ApiPromise } from '@polkadot/api';
import { MarketConfig } from '../../config/market-config';
import { CollectionsService } from './collections.service';
import { ResponseTokenDto } from '../dto';

@Injectable()
export class TokenService {
  private readonly collectionsRepository: Repository<Collection>;
  private readonly tokensRepository: Repository<Tokens>;
  private readonly logger: Logger;

  constructor(
    @Inject('DATABASE_CONNECTION') private db: Connection,
    @Inject('UNIQUE_API') private unique: ApiPromise,
    @Inject('CONFIG') private config: MarketConfig,
    private collectionsService: CollectionsService,
  ) {
    this.collectionsRepository = db.getRepository(Collection);
    this.tokensRepository = db.getRepository(Tokens);
    this.logger = new Logger(TokenService.name);
  }

  /**
   * Add allowed token for collection
   */
  async addTokens(collection: string, data: { tokens: string }): Promise<ResponseTokenDto> {
    const reg = /^[0-9-,]*$/;
    if (!reg.test(data.tokens)) {
      throw new BadRequestException('Wrong format insert tokens');
    }
    // Checkout collection
    const collectionId = await this.collectionsService.findById(+collection);
    if (collectionId === undefined) throw new NotFoundException('Collection not found');
    // Create list tokens
    const tokenList = await this.calculateTokens(data.tokens, reg, collectionId.id);
    let collectionTokens = [];
    for (let token of tokenList.values()) {
      collectionTokens.push(`INSERT INTO "public"."tokens" (collection_id, token_id, owner_token) VALUES (${+collectionId.id},${token},'');`);
    }
    collectionTokens.sort((a, b) => a.token_id - b.token_id);
    let saveTokensString = collectionTokens.toString().split(';,').join(';\n');
    await this.createTokens(saveTokensString, collectionId.id);
    await this.collectionsService.updateAllowedTokens(+collection, data.tokens);

    return { statusCode: HttpStatus.OK, message: `Add allowed tokens: ${data.tokens} for collection: ${collectionId.id}` };
  }

  /**
   * Bulk insert tokens data
   * @param data
   */
  async createTokens(data: string, collection: string): Promise<void> {
    try {
      await this.removeTokenCollection(collection);
      this.db.transaction(async (entityManager) => {
        //await entityManager.createQueryBuilder().insert().into(Tokens).values(data).execute();
        await entityManager.query(data);
      });
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

  private async calculateTokens(tokens: string, regex: RegExp, collectionId: string): Promise<Set<number>> {
    const array = tokens.match(regex)[0];
    const arr = array.split(',');
    const allTokens = new Set<number>();
    arr.forEach((token) => {
      let rangeNum = token.split('-');
      if (rangeNum.length > 1) {
        for (let i = parseInt(rangeNum[0]); i < parseInt(rangeNum[1]) + 1; i++) {
          allTokens.add(i);
        }
      } else {
        allTokens.add(parseInt(token));
      }
    });
    return allTokens;
  }
}
