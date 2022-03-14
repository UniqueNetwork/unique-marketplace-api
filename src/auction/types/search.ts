export type CollectionToken = {
  collectionId: number;
  tokenId: number;
  network?: string;
};

export type TokenInfo = {
  locale: string;
  is_trait?: boolean;
  text: string;
};
