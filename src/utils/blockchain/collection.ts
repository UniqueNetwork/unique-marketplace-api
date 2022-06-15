import { ApiPromise } from '@polkadot/api';
import { decodeSchema } from './token';
import { mapProperties, vec2str } from './util';

export enum TypeAPI {
  old = 'old',
  properties = 'properties',
}

export type CollectionType = {
  schema: {
    [propName: string]: any;
  };
  name: string;
  offchainSchema: string;
  collectionCover: any;
  tokenPrefix: string;
  description: string;
  typeAPI: TypeAPI;
  collectionId: number;
  [propName: string]: any;
};

interface CollectionInterface {
  getById(id: number): Promise<CollectionType>;
}

class CollectionBase {
  protected api;

  constructor(api: ApiPromise) {
    this.api = api;
  }
}

class CollectionOld extends CollectionBase implements CollectionInterface {
  async getById(id: number): Promise<CollectionType> {
    try {
      const collection = await this.api.query.common.collectionById(id);
      const humanCollection = collection.toHuman();

      if (humanCollection === null || humanCollection === undefined) {
        return null;
      }

      if (humanCollection['properties']) {
        return null;
      }

      return {
        collection: humanCollection,
        collectionId: id,
        schema: decodeSchema(humanCollection['constOnChainSchema']),
        tokenPrefix: humanCollection['tokenPrefix'],
        offchainSchema: humanCollection['offchainSchema'] || null,
        name: vec2str(humanCollection['name']) || null,
        description: vec2str(humanCollection['description']) || null,
        collectionCover: humanCollection['variableOnChainSchema'] || null,
        typeAPI: TypeAPI.old,
      };
    } catch (error) {
      return null;
    }
  }
}

class CollectionProperty extends CollectionBase implements CollectionInterface {
  async getById(id: number): Promise<CollectionType> {
    try {
      const collection = await this.api.rpc.unique.collectionById(id);
      const humanCollection = collection.toHuman();
      const property = mapProperties(humanCollection);
      let schema = null;

      if (humanCollection === null || humanCollection === undefined) {
        return null;
      }

      if (property['constOnChainSchema']) {
        schema = decodeSchema(property['constOnChainSchema']);
      }

      return {
        collection: humanCollection,
        collectionId: id,
        schema,
        tokenPrefix: humanCollection['tokenPrefix'],
        offchainSchema: property['offchainSchema'] || null,
        name: vec2str(humanCollection['name']) || null,
        description: vec2str(humanCollection['description']) || null,
        collectionCover: property['variableOnChainSchema'] || null,
        typeAPI: TypeAPI.properties,
      };
    } catch (error) {
      return null;
    }
  }
}

export class ProxyCollection implements CollectionInterface {
  private collectionOld: CollectionOld;
  private collectionProperty: CollectionProperty;
  private typeApi: TypeAPI;
  static instace: ProxyCollection;

  api: ApiPromise;

  constructor(api: ApiPromise, typeApi = TypeAPI.properties) {
    this.api = api;
    this.typeApi = typeApi;
  }

  static getInstance(api: ApiPromise, typeApi = TypeAPI.properties): ProxyCollection {
    if (this.instace === null || this.instace === undefined) {
      this.instace = new ProxyCollection(api, typeApi);
    }
    return this.instace;
  }

  async getById(id: number): Promise<CollectionType> {
    let collection = null;

    if (this.typeApi === TypeAPI.properties) {
      if (this.collectionProperty === null || this.collectionProperty === undefined) {
        this.collectionProperty = new CollectionProperty(this.api);
      }
      collection = await this.collectionProperty.getById(id);
    }

    if (collection === null || collection === undefined) {
      if (this.collectionOld === null || this.collectionOld === undefined) {
        this.collectionOld = new CollectionOld(this.api);
        this.typeApi = TypeAPI.old;
      }
      collection = await this.collectionOld.getById(id);
    }

    if (collection) {
      return collection;
    }
    return null;
  }
}
