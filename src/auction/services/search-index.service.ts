
import { decodeData, decodeSchema } from './../../utils/blockchain/token';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { Connection, Repository } from 'typeorm';
import { ApiPromise } from '@polkadot/api';
import { MarketConfig } from '../../config/market-config';
import { SearchIndex } from '../../entity';

import { v4 as uuid } from 'uuid';
import { CollectionToken, TokenInfo, TypeAttributToken, TypeConstSchema } from '../types';


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
    }
  }

  private reduceAcc(acc: TokenInfo[], item): TokenInfo[] {

    if (['Prefix','ImageURL'].includes(item.type)) {
      acc.push({ ...item, items: [item.text] })
    }

    if (item.type === 'String') {
      const findIndex = acc.findIndex((i) => i.type === 'String');
      if (findIndex !== -1) {
        acc[findIndex].items.push(item.text);
      } else {
        acc.push({ ...item, items: [item.text] });
      }
    }

    if (item.type === 'Enum') {
      const findIndex = acc.findIndex((i) => i.key === item.key);
      if (findIndex !== -1) {
        acc[findIndex].items.push(item.text);
      } else {
        acc.push({...item, items: [item.text]});
      }
    }
    return acc;
  }

  async getTokenInfoItems({ collectionId, tokenId }: CollectionToken): Promise<TokenInfo[]> {
    const keywords = [];
    const collection = await this.schema(collectionId);
    const schema = collection.constOnChainSchema;
    const token =  await this.uniqueApi.query.nonfungible.tokenData(collectionId, tokenId);
    const constData = token.toHuman()['constData'] || null;
    // todo implement something like in src/escrow/unique.ts @ getSearchIndexes

    keywords.push({
      locale: null,
      text: collection.tokenPrefix,
      type: TypeAttributToken.Prefix
    })

    if (collection.offchainSchema.length !== 0) {
      keywords.push({
        locale: null,
        text: collection.offchainSchema.replace('{id}', String(tokenId)),
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
    return keywords.filter((x) => typeof x.text === 'string' && x.text.trim() !== '').reduce(this.reduceAcc, []);
  }

  *getKeywords(protoSchema, dataObj) {
    for (const key of Object.keys(dataObj)) {

      const resolvedType = protoSchema.fields[key].resolvedType;

      if (this.BLOCKED_SCHEMA_KEYS.includes(key)) {
        yield {
          locale: null,
          text: JSON.parse(dataObj[key]).ipfs,
          type: TypeAttributToken.ImageURL,
          is_trait: false
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
          text: dataObj[key] ,
          is_trait: false,
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
          text: translationObject[k] ,
          is_trait: (typeFieldString  === 'Enum' ? true : false),
          type: (typeFieldString  === 'Enum' ? TypeAttributToken.Enum : TypeAttributToken.String),
          key: (typeFieldString  === 'Enum' ? key : null),
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
        is_trait: item.is_trait,
        type: item.type
      }));

    await this.repository.save(searchIndexItems);
  }
}
