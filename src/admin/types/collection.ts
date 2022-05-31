import type { Vec, u16 } from '@polkadot/types-codec';

export enum CollectionMode {
  NFT = 'NFT',
  Fungible = 'Fungible',
  ReFungible = 'ReFungible',
}

export type HumanizedCollection = {
  owner: string;
  mode: CollectionMode;
  access: string;
  tokenPrefix: string;
  mintMode: boolean;
  name: Vec<u16>;
  description: Vec<u16>;
};

export type DecodedCollection = {
  owner: string;
  mode: CollectionMode;
  access: string;
  tokenPrefix: string;
  mintMode: boolean;
  name: string;
  description: string;
};
