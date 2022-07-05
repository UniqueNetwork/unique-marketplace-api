import { hexToU8a } from '@polkadot/util';

import * as logging from '../logging';
import * as protobuf from 'protobufjs';
import { CollectionType, TypeAPI } from './collection';
import { ApiPromise } from '@polkadot/api';
import { mapProperties } from './util';

export const decodeSchema = (schema) => {
  try {
    if (!schema) {
      return null;
    }

    const protoJson = JSON.parse(schema);
    const root = protobuf.Root.fromJSON(protoJson);
    const data = { json: protoJson, NFTMeta: null };

    try {
      data.NFTMeta = root.lookupType('onChainMetaData.NFTMeta');
    } catch (e) {}

    return data;
  } catch (error) {
    logging.log('decodeSchema error', logging.level.WARNING);
    logging.log(error, logging.level.ERROR);
    return null;
  }
};

export const decodeData = (data, schema) => {
  if (!schema) {
    return { data: data, human: null };
  }

  if (schema?.NFTMeta === null) return { data: data, human: null };
  let tokenDataBuffer;
  try {
    tokenDataBuffer = hexToU8a(data);
  } catch (e) {
    logging.log(e, logging.level.WARNING);
    return { data: data, human: null };
  }

  const message = schema.NFTMeta.decode(tokenDataBuffer),
    humanObj = message.toJSON();
  // Maybe convert the message back to a plain object
  const obj = schema.NFTMeta.toObject(message, {
    longs: String, // longs as strings (requires long.js)
    bytes: String, // bytes as base64 encoded strings
    defaults: true, // includes default values
    arrays: true, // populates empty arrays (repeated fields) even if defaults=false
    objects: true, // populates empty objects (map fields) even if defaults=false
    oneofs: true,
  });

  return { data: obj, human: humanObj };
};

const encodeDataBuffer = (schema, payload) => {
  try {
    const NFTMeta = decodeSchema(schema).NFTMeta;

    const errMsg = NFTMeta.verify(payload);

    if (errMsg) {
      throw Error(errMsg);
    }

    const message = NFTMeta.create(payload);

    return NFTMeta.encode(message).finish();
  } catch (e) {
    logging.log('encodeDataBuffer error', logging.level.WARNING);
    logging.log(e, logging.level.ERROR);
  }

  return new Uint8Array(0);
};

export const encodeData = (schema, payload) => {
  return '0x' + Buffer.from(encodeDataBuffer(schema, payload)).toString('hex');
};

type TokenType = {
  collectionId: number;
  tokenId: number;
  owner: any;
  constData: any;
  variableData: any;
  image: string;
  originalToken: any;
};

interface TokenInterface {
  tokenId(tokenId: number, collectionId: number): Promise<Partial<TokenType>>;
  tokenIdSchema(tokenId: number, collectionId: number, schema: any): Promise<Partial<TokenType>>;
  tokenIdCollection(tokenId: number, collection: Partial<CollectionType>): Promise<Partial<TokenType>>;
}

export class ProxyToken implements TokenInterface {
  static instance: ProxyToken;

  protected api;
  protected type;

  constructor(api: ApiPromise, type = TypeAPI.properties) {
    this.api = api;
    this.type = type;
  }

  static getInstance(api: ApiPromise, type = TypeAPI.properties): ProxyToken {
    if (!ProxyToken.instance) {
      ProxyToken.instance = new ProxyToken(api, type);
    }
    return ProxyToken.instance;
  }

  async tokenId(tokenId: number, collectionId: number): Promise<Partial<TokenType>> {
    let _token = null;
    let _tokenHuman = null;
    let _data = null;
    let _variableData = null;

    try {
      _token = (await this.api.rpc?.unique?.tokenData(collectionId, tokenId)) || null;
      _tokenHuman = _token.toHuman();
      const property = mapProperties(_tokenHuman);
      _data = property?.constData || null;
      _variableData = property?.variableData || null;
    } catch (error) {
      console.error(error);
      _token = null;
    }

    return {
      collectionId: collectionId,
      tokenId: tokenId,
      owner: _tokenHuman?.owner || null,
      constData: _data,
      variableData: _variableData,
      image: null,
      originalToken: _token,
    };
  }

  async tokenIdSchema(tokenId: number, collectionId: number, schema: any): Promise<Partial<TokenType>> {
    const _token = await this.tokenId(tokenId, collectionId);
    const _data = decodeData(_token.constData, schema);
    return {
      ..._token,
      constData: _data,
      image: _data.human?.ipfsJson ? JSON.parse(_data.human?.ipfsJson)?.ipfs : null,
    };
  }

  async tokenIdCollection(tokenId: number, collection: CollectionType): Promise<Partial<TokenType>> {
    return this.tokenIdSchema(tokenId, collection.collectionId, collection.schema);
  }
}
