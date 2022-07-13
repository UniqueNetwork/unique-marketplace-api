import { BadRequestException, HttpStatus, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Connection, In, Repository } from 'typeorm';
import { Collection, ContractAsk, Tokens } from '../../entity';
import { CollectionsService } from './collections.service';
import { ResponseTokenDto } from '../dto';
import { BnList } from '@polkadot/util/types';
import { InjectUniqueAPI } from '../../blockchain';

@Injectable()
export class TokenService {
  private readonly tokensRepository: Repository<Tokens>;
  private readonly logger: Logger;
  private readonly MAX_TOKEN_NUMBER = 2147483647;
  private readonly contractAskRepository: Repository<ContractAsk>;

  constructor(
    @Inject('DATABASE_CONNECTION') private connection: Connection,
    private collectionsService: CollectionsService,
    @InjectUniqueAPI() private unique,
  ) {
    this.tokensRepository = connection.getRepository(Tokens);
    this.logger = new Logger(TokenService.name);
    this.contractAskRepository = connection.getRepository(ContractAsk);
  }

  /**
   * Add allowed token for collection
   * @param {string} collection - collection id
   * @param {Object} data - tokens format
   * @return {Promise<void>}#
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
    await this.removeTokens(collectionId);
    const message =
      data.tokens === ''
        ? `Add allowed tokens: all tokens for collection: ${collectionId.id}`
        : `Add allowed tokens: ${data.tokens} for collection: ${collectionId.id}`;

    return {
      statusCode: HttpStatus.OK,
      message,
    };
  }

  /**
   * Bulk insert tokens data
   * @param data
   */
  async createTokens(data: string, collection: string): Promise<void> {
    try {
      await this.removeTokenCollection(collection);
      await this.connection.transaction(async (entityManager) => {
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
    await this.tokensRepository
      .createQueryBuilder()
      .delete()
      .from(Tokens)
      .where('collection_id = :collection_id', { collection_id: collection })
      .execute();
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
          throw new BadRequestException(
            `Wrong token in the last range: ${rangeNum[0]} - [ ${rangeNum[1]} ]! Maximum ${this.MAX_TOKEN_NUMBER}`,
          );
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

  async getAllTokens(collection: any): Promise<number[]> {
    const arrayDiff = [];
    const allowedTokens = collection.allowedTokens !== '' ? collection.allowedTokens.split(',').map((t) => t) : [];
    if (allowedTokens.length > 0) {
      for (const token of allowedTokens) {
        const rangeNum = token.split('-');
        if (rangeNum.length > 1) {
          const start = +rangeNum[0];
          const end = +rangeNum[1];
          for (let i = start; i <= end; i++) {
            arrayDiff.push(i);
          }
        } else {
          arrayDiff.push(+token);
        }
      }
    }
    return arrayDiff;
  }

  async removeTokens(collection: Collection): Promise<void | BadRequestException> {
    if (!collection) throw new BadRequestException(`Collection #${collection.id} not found`);
    const tokens: BnList = await this.unique.rpc.unique.collectionTokens(collection.id);
    const tokenIdsList = tokens.map((t) => t.toNumber()).sort((a, b) => a - b);

    const arrayAllowedTokens = await this.getAllTokens(collection);

    ///'------------------------------------------------------';
    let carActive, carRemoved;
    for (const token of tokenIdsList) {
      if (arrayAllowedTokens.indexOf(token) !== -1) {
        carActive = await this.contractAskRepository.findOne({
          collection_id: collection.id,
          token_id: String(token),
          status: In(['removed_by_admin']),
        });
        if (carActive) {
          carActive.status = 'active';
          await this.contractAskRepository.update(carActive.id, carActive);
        }
      } else {
        carRemoved = await this.contractAskRepository.findOne({
          collection_id: collection.id,
          token_id: String(token),
          status: In(['active']),
        });
        if (carRemoved) {
          arrayAllowedTokens.length > 0 ? (carRemoved.status = 'removed_by_admin') : (carRemoved.status = 'active');
          await this.contractAskRepository.update(carRemoved.id, carRemoved);
        }
      }
    }
  }
}
