import type { Vec, u16 } from '@polkadot/types-codec';

export enum CollectionMode {
  NFT = 'NFT',
  Fungible = 'Fungible',
  ReFungible = 'ReFungible',
}

export enum CollectionStatus {
  Enabled = 'Enabled',
  Disabled = 'Disabled',
}

export enum CollectionImportType {
  Env = 'Env',
  Api = 'Api',
}

export type HumanizedCollection = {
  owner: string;
  mode: CollectionMode;
  tokenPrefix: string;
  name: Vec<u16>;
  description: Vec<u16>;
};

export type DecodedCollection = {
  owner: string;
  mode: CollectionMode;
  tokenPrefix: string;
  name: string;
  description: string;
};
