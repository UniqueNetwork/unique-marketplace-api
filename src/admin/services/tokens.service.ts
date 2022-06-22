import { BadRequestException, HttpStatus, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Connection, Repository } from 'typeorm';
import { Tokens } from '../../entity';
import { CollectionsService } from './collections.service';
import { ResponseTokenDto } from '../dto';

@Injectable()
export class TokenService {
  private readonly tokensRepository: Repository<Tokens>;
  private readonly logger: Logger;
  private readonly MAX_TOKEN_NUMBER = 2147483647;

  constructor(@Inject('DATABASE_CONNECTION') private connection: Connection, private collectionsService: CollectionsService) {
    this.tokensRepository = connection.getRepository(Tokens);
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
    await this.checkoutTokens(data.tokens, reg);
    // Checkout collection
    const collectionId = await this.collectionsService.findById(+collection);
    if (collectionId === undefined) throw new NotFoundException('Collection not found');
    await this.collectionsService.updateAllowedTokens(+collection, data.tokens);
    return {
      statusCode: HttpStatus.OK,
      message: `Add allowed tokens: ${data.tokens} for collection: ${collectionId.id}`,
    };
  }

  /**
   * Bulk insert tokens data
   * @param data
   */
  async createTokens(data: string, collection: string): Promise<void> {
    try {
      await this.removeTokenCollection(collection);
      this.connection.transaction(async (entityManager) => {
        //await entityManager.createQueryBuilder().insert().into(Tokens).values(data).execute();
        await entityManager.query(data);
      });
    } catch (e) {
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: e.message,
        error: e.error,
      });
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

  /**
   * Checking tokens. Check the input range. It is forbidden to enter a token with a null value. Checking the data format.
   * @param {string} tokens - tokens format
   * @param {RegExp} regex
   * @private
   * @return ({Promise<void | BadRequestException>})
   */
  private async checkoutTokens(tokens: string, regex: RegExp): Promise<void | BadRequestException> {
    const array = tokens.match(regex)[0];
    const arr = array.split(',');
    arr.forEach((token) => {
      const rangeNum = token.split('-');
      if (rangeNum.length > 1) {
        if (parseInt(rangeNum[0]) > this.MAX_TOKEN_NUMBER) {
          throw new BadRequestException(
            `Wrong token in the first range: [ ${rangeNum[0]} ] - ${rangeNum[1]}! Maximum ${this.MAX_TOKEN_NUMBER}. The start number in the range cannot be greater than the end number!`,
          );
        }
        if (parseInt(rangeNum[1]) > this.MAX_TOKEN_NUMBER) {
          throw new BadRequestException(`Wrong token in the last range: ${rangeNum[0]} - [ ${rangeNum[1]} ]! Maximum ${this.MAX_TOKEN_NUMBER}`);
        }

        if (rangeNum[0] === '' || rangeNum[1] === '') {
          throw new BadRequestException(`Wrong tokens range! Set the correct range! Example: 2-300`);
        }
        if (parseInt(rangeNum[0]) === 0 || parseInt(rangeNum[1]) === 0) {
          throw new BadRequestException('Wrong tokens range! There is no zero token!');
        }
        if (parseInt(rangeNum[0]) > parseInt(rangeNum[1])) {
          throw new BadRequestException(`Wrong tokens range! Set the correct range! Example: 1-10 or 42-1337 `);
        }
      } else {
        if (parseInt(token) === 0) {
          throw new BadRequestException('Wrong token! There is no zero token!');
        }
        if (parseInt(token) > 2147483647) {
          throw new BadRequestException(`Wrong token > ${parseInt(token)} ! Maximum ${this.MAX_TOKEN_NUMBER}`);
        }
      }
    });
  }
}
