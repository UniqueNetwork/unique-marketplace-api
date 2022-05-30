export enum CollectionMode {
  NFT = 'NFT',
  Fungible = 'Fungible',
  ReFungible = 'ReFungible',
}

export type DecodedCollection = {
  owner: string;
  mode: CollectionMode;
  access: string;
  tokenPrefix: string;
  mintMode: boolean;
  name: string;
  description: string;
};
