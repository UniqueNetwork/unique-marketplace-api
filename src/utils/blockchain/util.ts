import * as fs from 'fs';
import * as path from 'path';

import { ApiPromise, Keyring } from '@polkadot/api';
import { cryptoWaitReady, decodeAddress, encodeAddress } from '@polkadot/util-crypto';
import { IKeyringPair } from '@polkadot/types/types';

import { signTransaction, transactionStatus } from './polka';
import * as tokenUtil from './token'


const vec2str = arr => {
  return arr.map(x => String.fromCharCode(parseInt(x))).join('')
}

const str2vec = string => {
  if(typeof string !== 'string') return string;
  return Array.from(string).map(x => x.charCodeAt(0));
}

type CrossAccountId = {
  Substrate: string,
} | {
  Ethereum: string,
}

interface TokenParams {
  collectionId: bigint;
  owner: CrossAccountId | string;
  constData?: string;
  variableData?: string;
}

interface CollectionParams {
  name: string;
  description: string;
  tokenPrefix: string;
  modeprm?: any
}

class UniqueExplorer {
  api;
  admin: IKeyringPair;

  constructor(api: ApiPromise, admin: IKeyringPair) {
    this.api = api;
    this.admin = admin;
  }

  async getCollectionSchema(collectionId) {
    const collection = await this.api.query.common.collectionById(collectionId);
    return {collection, schema: tokenUtil.decodeSchema(collection.toHuman().constOnChainSchema)};
  }

  async getTokenData(tokenId, collectionId, schema?) {
    if(!schema) schema = await this.getCollectionSchema(collectionId);
    const constDataRaw = (await this.api.rpc.unique.constMetadata(collectionId, tokenId)).toHuman();
    return {...schema, data: tokenUtil.decodeData(constDataRaw, schema.schema)};
  }

  async getCollectionData (collectionId: bigint) {
    const collection = await this.api.query.common.collectionById(collectionId);
    let humanCollection = collection.toHuman(), collectionData = {id: collectionId, raw: humanCollection};
    if(humanCollection === null) return null;
    for(let key of ['name', 'description']) {
      collectionData[key] = vec2str(humanCollection[key]);
    }
    collectionData['tokensCount'] = (await this.api.rpc.unique.lastTokenId(collectionId)).toJSON();
    return collectionData;
  }

  /**
   * Get token data
   * @description Returns token data with encrypted collection data and owner substrate and owner ethereum address
   * @param collectionId
   * @param tokenId
   * @return Promise({constData: string, variableData: string, owner: { substrate?: string, ethereum?: string }})
   */
  async tokenData(collectionId: bigint, tokenId: bigint) {
    return (await this.api.query.nonfungible.tokenData(collectionId, tokenId)).toJSON()
  }

  /**
   * Get token owner
   * @description Returns ethereum or substrate address
   * @deprecated  use {getTokenOwnerData}
   * @param collectionId
   * @param tokenId
   * @return Promise({ substrate?: string, ethereum?: string })
   */
  async getTokenOwner(collectionId: bigint, tokenId: bigint) {
    const owner = (await this.api.query.nonfungible.tokenData(collectionId, tokenId)).toJSON()
    return owner.owner
  }

  async createCollection(options: CollectionParams, label='new collection') {
    if(typeof options.modeprm === 'undefined') options.modeprm = {nft: null};
    let creationResult = await signTransaction(
      this.admin,
      this.api.tx.unique.createCollection(str2vec(options.name), str2vec(options.description), str2vec(options.tokenPrefix), options.modeprm),
      'api.tx.unique.createCollection'
    ) as any;
    if(creationResult.status !== transactionStatus.SUCCESS) {
      throw Error(`Unable to create collection for ${label}`);
    }

    let collectionId = null;
    creationResult.result.events.forEach(({event: {data, method, section}}) => {
      if ((section === 'common') && (method === 'CollectionCreated')) {
        collectionId = parseInt(data[0].toString(), 10);
      }
    });

    if(collectionId === null) {
      throw Error(`No CollectionCreated event for ${label}`)
    }

    return collectionId;
  }

  async createToken(options: TokenParams, label='new token') {
    let creationResult = await signTransaction(
      this.admin,
      this.api.tx.unique.createItem(options.collectionId, (typeof options.owner === 'string') ? { Substrate: options.owner } : options.owner, { nft: { const_data: options.constData, variable_data: options.variableData } }),
      'api.tx.unique.createItem'
    ) as any;
    if(creationResult.status !== transactionStatus.SUCCESS) {
      throw Error(`Unable to create token for ${label}`);
    }
    let success = false, createdCollectionId = null, tokenId = null, recipient = null;
    creationResult.result.events.forEach(({event: {data, method, section}}) => {
      if (method === 'ExtrinsicSuccess') {
        success = true;
      } else if ((section === 'common') && (method === 'ItemCreated')) {
        createdCollectionId = parseInt(data[0].toString(), 10);
        tokenId = parseInt(data[1].toString(), 10);
        recipient = data[2].toJSON();
      }
    });
    return {success, tokenId, recipient, collectionId: createdCollectionId};
  }

  async burnToken({collectionId, tokenId}) {
    await signTransaction(
      this.admin,
      this.api.tx.unique.burnItem(collectionId, tokenId, 1),
      'api.tx.unique.burnItem'
    );
    return !((await this.api.rpc.unique.tokenExists(collectionId, tokenId)).toJSON())
  }
}


type AnyAccountFormat = string
  | { address: string }
  | { Ethereum: string }
  | { ethereum: string }
  | { Substrate: string }
  | { substrate: string }
  | Object;

type NormalizedAccountFormat = { Ethereum: string } | { Substrate: string } | any;

const normalizeAccountId = (input: AnyAccountFormat): NormalizedAccountFormat => {
  if (typeof input === 'string') {
    if (input.length === 48 || input.length === 47) {
      return {Substrate: input};
    } else if (input.length === 42 && input.startsWith('0x')) {
      return {Ethereum: input.toLowerCase()};
    } else if (input.length === 40 && !input.startsWith('0x')) {
      return {Ethereum: '0x' + input.toLowerCase()};
    } else {
      throw new Error(`Unknown address format: "${input}"`);
    }
  }
  if ('address' in input) {
    return {Substrate: input.address};
  }
  if ('Ethereum' in input) {
    return {
      Ethereum: input.Ethereum.toLowerCase(),
    };
  } else if ('ethereum' in input) {
    return {
      Ethereum: (input as any).ethereum.toLowerCase(),
    };
  } else if ('Substrate' in input) {
    return input;
  } else if ('substrate' in input) {
    return {
      Substrate: (input as any).substrate,
    };
  }

  // AccountId
  return {Substrate: input.toString()};
}


const privateKey = (account: string) => {
  const keyring = new Keyring({type: 'sr25519'});

  return keyring.addFromUri(account);
}


const extractCollectionIdFromAddress = (address: string): number => {
  if (!(address.length == 42 || address.length == 40)) throw new Error('address wrong format');
  return parseInt(address.substr(address.length - 8), 16);
}

const blockchainStaticFile = (filename: string): string => {
  return fs.readFileSync(path.join(__dirname, '..', '..','..', 'blockchain', filename)).toString();
}

const seedToAddress = async (seed: string): Promise<string> => {
  await cryptoWaitReady();
  const keyring = new Keyring({type: 'sr25519'});
  return keyring.addFromUri(seed).address;
}

const convertAddress = async (address: string, ss58Format?: number): Promise<string> => {
  await cryptoWaitReady();

  return encodeAddress(decodeAddress(address), ss58Format);
};

export {
  vec2str, str2vec, UniqueExplorer, normalizeAccountId, privateKey, extractCollectionIdFromAddress,
  blockchainStaticFile, seedToAddress, convertAddress,
}