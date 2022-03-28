
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

    keywords.push({
      locale: null,
      text: collection.offchainSchema.replace('{id}', String(tokenId)),
      type: TypeAttributToken.ImageURL
    })

    if (constData) {
      const tokenData = decodeData(constData, schema);
      try {
        for (let k of this.getKeywords(schema.NFTMeta, tokenData.human)) {

          k['type'] = TypeAttributToken.String;

          if (k.is_trait) {
            k['type'] = TypeAttributToken.Enum;
          }

          keywords.push(k);
        }
      } catch (e) {
        this.logger.debug(`Unable to get search indexes for token #${tokenId} from collection #${collectionId}`);
      }
    }

    return keywords.filter((x) => typeof x.text === 'string' && x.text.trim() !== '');
  }

  *getKeywords(protoSchema, dataObj) {
    for (const key of Object.keys(dataObj)) {
      const isTrait = (key === 'traits' || key === 'Traits');
      yield { locale: null, text: key , is_trait: false };
      if (protoSchema.fields[key].resolvedType && protoSchema.fields[key].resolvedType.constructor.name.toString() === 'Enum') {
        if (Array.isArray(dataObj[key])) {
          for (let i = 0; i < dataObj[key].length; i++) {
            yield* this.convertEnumToString(dataObj[key][i], key, protoSchema, isTrait);
          }
        } else {
          yield* this.convertEnumToString(dataObj[key], key, protoSchema, isTrait);
        }
      } else {
        yield {
          locale: null,
          text: dataObj[key] ,
          is_trait: false
        };
      }
    }
  }

  *convertEnumToString(value, key, protoSchema, isTrait) {
    try {
      const valueJsonComment = protoSchema.fields[key].resolvedType.options[value];
      const translationObject = JSON.parse(valueJsonComment);
      if (translationObject) {
        yield* Object.keys(translationObject).map((k) => ({
          locale: k,
          text: translationObject[k] ,
          is_trait: isTrait
        }));
      }
    } catch (e) {
      this.logger.error(`Error parsing schema when trying to convert enum to string`);
    }
  }

  async saveSearchIndex(collectionToken: CollectionToken, items: TokenInfo[]): Promise<void> {

    const prepare = [];

    prepare.push({
      locale: null,
      items: items.filter((item) => item.type === TypeAttributToken.Prefix).map((item) => item.text),
      type: TypeAttributToken.Prefix,
      is_trait: false
    });

    prepare.push({
      locale: null,
      items: items.filter((item) => item.type === TypeAttributToken.ImageURL).map((item) => item.text),
      type: TypeAttributToken.ImageURL,
      is_trait: false
    });

    prepare.push({
      locale: 'en',
      items: items.filter((item) => item.type === TypeAttributToken.String).map((item) => item.text),
      type: TypeAttributToken.String,
      is_trait: false,
    });

    prepare.push({
      locale: 'en',
      items: items.filter((item) => item.type === TypeAttributToken.Enum).map((item) => item.text),
      type: TypeAttributToken.Enum,
      is_trait: true
    })
    console.log(prepare);

    const searchIndexItems: SearchIndex[] = prepare.map((item) => this.repository.create({
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
