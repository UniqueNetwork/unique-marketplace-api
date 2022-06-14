import { decodeData, decodeSchema } from './../../utils/blockchain/token';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { Connection, Repository } from 'typeorm';
import { ApiPromise } from '@polkadot/api';
import { MarketConfig } from '../../config/market-config';
import { SearchIndex } from '../../entity';

import { v4 as uuid } from 'uuid';
import { CollectionToken, TokenInfo, TypeAttributToken, TypeConstSchema } from '../types';
import { vec2str } from './../../utils/blockchain/util';


@Injectable()
export class SearchIndexService {
  private network: string;
  private repository: Repository<SearchIndex>;
  private readonly logger = new Logger(SearchIndexService.name);

  private BLOCKED_SCHEMA_KEYS = ['ipfsJson'];

  constructor(
    @Inject('DATABASE_CONNECTION') private connection: Connection,
    @Inject('UNIQUE_API') private uniqueApi: ApiPromise,
    @Inject('CONFIG') private config: MarketConfig,
  ) {
    this.network = this.config.blockchain.unique.network;
    this.repository = connection.getRepository(SearchIndex);
  }

  async addSearchIndexIfNotExists(collectionToken: CollectionToken): Promise<void> {
    const isExists = await this.getIfExists(collectionToken);
    if (isExists) return;

    const searchIndexItems = await this.getTokenInfoItems(collectionToken);
    await this.saveSearchIndex(collectionToken, searchIndexItems);
  }

  async getIfExists(collectionToken: CollectionToken): Promise<boolean> {
    return await this.repository
      .findOne({
        where: {
          collection_id: String(collectionToken.collectionId),
          token_id: String(collectionToken.tokenId),
          network: collectionToken?.network || this.network,
        },
      })
      .then(Boolean);
  }

  private async schema(collectionId: number): Promise<TypeConstSchema> {
    const collection = await this.uniqueApi.query.common.collectionById(collectionId);
    const schema = decodeSchema(collection.toHuman()['constOnChainSchema']);
    return {
      tokenPrefix: collection.toHuman()['tokenPrefix'],
      constOnChainSchema: schema,
      offchainSchema: collection.toHuman()['offchainSchema'],
      name: vec2str(collection.toHuman()['name']),
      description: vec2str(collection.toHuman()['description']),
      collectionCover: collection.toHuman()['variableOnChainSchema']
    }
  }

  private reduceAcc(acc: TokenInfo[], item): TokenInfo[] {
    if (item.type === 'Enum') {
      const findIndex = acc.findIndex((i) => i.key === item.key);
      if (findIndex !== -1) {
        acc[findIndex].items = [...acc[findIndex].items, ...item.items];
      } else {
        acc.push({ ...item, items: [...item.items] });
      }
    } else {
      acc.push({ ...item });
    }
    return acc;
  }

  private getCollectionCover(collection: TypeConstSchema): string {
    if (collection?.collectionCover) {
      return JSON.parse(collection?.collectionCover)?.collectionCover
    }
    return collection.offchainSchema.replace('{id}', '1');
  }

  async getTokenInfoItems({ collectionId, tokenId }: CollectionToken): Promise<TokenInfo[]> {
    const keywords = [];
    const collection = await this.schema(collectionId);
    const schema = collection.constOnChainSchema;
    const token = await this.uniqueApi.query.nonfungible.tokenData(collectionId, tokenId);
    const constData = token.toHuman()['constData'] || null;

    keywords.push({
      locale: null,
      items: [this.getCollectionCover(collection)],
      key: 'collectionCover',
      type: TypeAttributToken.ImageURL
    });

    keywords.push({
      locale: null,
      items: [collection.tokenPrefix],
      key: 'prefix',
      type: TypeAttributToken.Prefix
    });
    keywords.push({
      locale: null,
      items: [collection.description],
      key: 'description',
      type: TypeAttributToken.String
    });
    keywords.push({
      locale: null,
      items: [collection.name],
      key: 'collectionName',
      type: TypeAttributToken.String
    });
    keywords.push({
      locale: null,
      items: [`${tokenId}`],
      key: 'tokenId',
      type: TypeAttributToken.Number
    });

    if (collection.offchainSchema.length !== 0) {
      keywords.push({
        locale: null,
        key: 'image',
        items: [collection.offchainSchema.replace('{id}', String(tokenId))],
        type: TypeAttributToken.ImageURL
      })
    }

    if (constData) {
      const tokenData = decodeData(constData, schema);
      try {
        for (let k of this.getKeywords(schema.NFTMeta, tokenData.human)) {
          keywords.push(k);
        }
      } catch (e) {
        this.logger.debug(`Unable to get search indexes for token #${tokenId} from collection #${collectionId}`);
      }
    }
    return keywords.reduce(this.reduceAcc, []);
  }

  *getKeywords(protoSchema, dataObj) {
    for (const key of Object.keys(dataObj)) {

      const resolvedType = protoSchema.fields[key].resolvedType;

      if (this.BLOCKED_SCHEMA_KEYS.includes(key)) {
        yield {
          locale: null,
          key: 'image',
          items: [JSON.parse(dataObj[key]).ipfs],
          type: TypeAttributToken.ImageURL
        }
        continue;
      }
      if (resolvedType && resolvedType.constructor.name.toString() === 'Enum') {
        if (Array.isArray(dataObj[key])) {
          for (let i = 0; i < dataObj[key].length; i++) {
            yield* this.convertEnumToString(dataObj[key][i], key, protoSchema);
          }
        } else {
          yield* this.convertEnumToString(dataObj[key], key, protoSchema);
        }
      } else {
        yield {
          locale: null,
          key,
          items: [dataObj[key]],
          type: TypeAttributToken.String
        };
      }
    }
  }

  *convertEnumToString(value, key, protoSchema) {
    try {

      const typeFieldString = protoSchema.fields[key].resolvedType.constructor.name.toString();

      const valueJsonComment = protoSchema.fields[key].resolvedType.options[value];
      const translationObject = JSON.parse(valueJsonComment);
      if (translationObject) {
        yield* Object.keys(translationObject).map((k) => ({
          locale: k,
          is_trait: (typeFieldString === 'Enum' ? true : false),
          key,
          items: [translationObject[k]],
          type: (typeFieldString === 'Enum' ? TypeAttributToken.Enum : TypeAttributToken.String),
        }));
      }
    } catch (e) {
      this.logger.error(`Error parsing schema when trying to convert enum to string`);
    }
  }

  async saveSearchIndex(collectionToken: CollectionToken, items: TokenInfo[]): Promise<void> {
    const searchIndexItems: SearchIndex[] = items.map((item) => this.repository.create({
        id: uuid(),
        collection_id: String(collectionToken.collectionId),
        token_id: String(collectionToken.tokenId),
        network: collectionToken?.network || this.network,
        locale: item.locale,
        items: item.items,
        key: item.key,
        is_trait: item.is_trait,
        type: item.type
      }));

    await this.repository.save(searchIndexItems);
  }

  async updateSearchIndex(): Promise<void> {
    for (const index of await this.repository.query(`select collection_id, token_id from search_index group by collection_id, token_id`)) {

      await this.repository.createQueryBuilder()
        .delete()
        .from(SearchIndex)
        .where('collection_id = :collection_id', { collection_id: index.collection_id })
        .andWhere('token_id = :token_id', { token_id: index.token_id })
        .execute();

      await this.addSearchIndexIfNotExists({
        collectionId: index?.collection_id,
        tokenId: index?.token_id
      });
    }
  }
}
