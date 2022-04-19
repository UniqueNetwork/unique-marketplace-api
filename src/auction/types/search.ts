export type CollectionToken = {
  collectionId: number;
  tokenId: number;
  network?: string;
};

export type TokenInfo = {
  locale: string;
  is_trait?: boolean;
  text?: string;
  type: TypeAttributToken
  key: string;
  items: Array<string>;
};

export enum TypeAttributToken {
  ImageURL = 'ImageURL',
  Enum = 'Enum',
  String = 'String',
  Prefix = 'Prefix',
  Number = 'Number'
}

export type TypeConstSchema = {
  tokenPrefix: string;
  constOnChainSchema: {
    [propName: string]: any
  },
  name: string,
  offchainSchema: string;
  description: string;
  collectionCover: string;
}

export interface TokenDescription {
  key?: string;
  value: string;
  type?: TypeAttributToken;
}