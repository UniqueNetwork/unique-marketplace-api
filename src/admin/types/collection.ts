import { Collection } from '../../entity';

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

export type DecodedCollection = {
  owner: string;
  mode: CollectionMode;
  tokenPrefix: string;
  name: string;
  description: string;
};

export type ImportByIdResult = {
  collection: Collection;
  message: string;
};
