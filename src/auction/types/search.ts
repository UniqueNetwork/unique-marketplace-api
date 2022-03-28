export type CollectionToken = {
  collectionId: number;
  tokenId: number;
  network?: string;
};

export type TokenInfo = {
  locale: string;
  is_trait?: boolean;
  text: string;
  type: TypeAttributToken
};

export enum TypeAttributToken {
  ImageURL = 'ImageURL',
  Enum = 'Enum',
  String = 'String',
  Prefix = 'Prefix'
}

export type TypeConstSchema = {
  tokenPrefix: string;
  constOnChainSchema: {
    [propName: string]: any
  },
  offchainSchema: string;
}