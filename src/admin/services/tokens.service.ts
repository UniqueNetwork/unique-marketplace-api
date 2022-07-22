import { BadRequestException, HttpStatus, Inject, Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { Connection, In, Repository } from 'typeorm';
import { Collection, OffersEntity, Tokens } from '../../entity';
import { CollectionsService } from './collections.service';
import { ResponseTokenDto } from '../dto';
import { BnList } from '@polkadot/util/types';
import { InjectUniqueAPI } from '../../blockchain';
import { Keyring } from '@polkadot/api';

export class TokensList {
  allowedList: number[];
  collectionList: number[];
  ownerList?: number[];
  ownerAllowedList?: number[];
}
export type TokensCollectionList = number[];

@Injectable()
export class TokenService {
  private readonly tokensRepository: Repository<Tokens>;
  private readonly logger: Logger;
  private readonly MAX_TOKEN_NUMBER = 2147483647;
  private readonly offersRepository: Repository<OffersEntity>;
  private readonly keyring = new Keyring({ type: 'sr25519' });

  constructor(
    @Inject('DATABASE_CONNECTION') private connection: Connection,
    private collectionsService: CollectionsService,
    @InjectUniqueAPI() private unique,
  ) {
    this.tokensRepository = connection.getRepository(Tokens);
    this.logger = new Logger(TokenService.name);
    this.offersRepository = connection.getRepository(OffersEntity);
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

  /**
   * Parse a record from the collection and get an array of tokens
   * @description Incoming data from the collection in the format: '1,3-5,7,9-11' we get an array of tokens: [1,3,4,5,7,9,10,11]
   * @param collection
   */
  async parseStringAllowedTokens(collection: any): Promise<number[]> {
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

  /**
   * Check if the token is in the list of allowed tokens
   * @param {Number} token - token number
   * @param {Number[]} arrayTokens - list of allowed tokens
   * @return {boolean}
   */
  hasAllowedToken(token: number, arrayTokens: number[]): boolean {
    return arrayTokens.indexOf(token) !== -1;
  }

  /**
   * Получаем объект с данными о токенах
   * @param {string} collection - collection id
   * @param {string} owner - Substrate address owner tokens
   * @return {Promise<TokensList>}
   */
  async getArrayAllowedTokens(collectionId: number, owner = ''): Promise<TokensList> {
    const collection = await this.collectionsService.findById(collectionId);
    if (!collection) throw new BadRequestException(`Collection #${collection.id} not found`);
    const tokensCollection: BnList = await this.unique.rpc.unique.collectionTokens(collection.id);
    const tokenCollectionList = tokensCollection.map((t) => t.toNumber()).sort((a, b) => a - b);
    const arrayAllowedTokensTemp = await this.parseStringAllowedTokens(collection);
    const arrayAllowedTokens = arrayAllowedTokensTemp.length ? arrayAllowedTokensTemp : tokenCollectionList;

    if (owner !== '') {
      const accountTokens: BnList = await this.unique.rpc.unique.accountTokens(collection.id, {
        Substrate: owner,
      });
      const tokenOwnerList = accountTokens.map((t) => t.toNumber()).sort((a, b) => a - b);
      const tokenOwnerAllowedList = arrayAllowedTokens.filter((token) => tokenOwnerList.includes(token)) as number[];
      return {
        allowedList: arrayAllowedTokens,
        collectionList: tokenCollectionList,
        ownerList: tokenOwnerList,
        ownerAllowedList: tokenOwnerAllowedList,
      };
    } else {
      return {
        allowedList: arrayAllowedTokens,
        collectionList: tokenCollectionList,
      };
    }
  }

  async removeTokens(collection: Collection): Promise<void | BadRequestException> {
    const { allowedList, collectionList } = await this.getArrayAllowedTokens(+collection.id);

    ///'------------------------------------------------------';
    // Set removed_by_admin or active token status
    let tokenActive, tokenRemoved;
    for (const token of collectionList) {
      if (this.hasAllowedToken(token, allowedList)) {
        tokenActive = await this.offersRepository.findOne({
          where: {
            collection_id: collection.id.toString(),
            token_id: String(token),
            status: In(['removed_by_admin']),
          },
        });
        if (tokenActive) {
          tokenActive.status = 'active';
          await this.offersRepository.update(tokenActive.id, tokenActive);
        }
      } else {
        tokenRemoved = await this.offersRepository.findOne({
          where: {
            collection_id: collection.id,
            token_id: String(token),
            status: In(['active']),
          },
        });
        if (tokenRemoved) {
          allowedList.length > 0 ? (tokenRemoved.status = 'removed_by_admin') : (tokenRemoved.status = 'active');
          await this.offersRepository.update(tokenRemoved.id, tokenRemoved);
        }
      }
    }
  }
}
