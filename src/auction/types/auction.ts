export enum AuctionStatus {
  created = 'created',
  active = 'active',
  ended = 'ended',
}

export interface Auction {
  id: string;

  tokenId: string;

  collectionId: string;

  status: AuctionStatus;

  currency: string;

  startPrice: string;

  priceStep: string;

  currentPrice: string;

  stopAt: Date;

  createdAt: Date;

  updatedAt: Date;
}

export type NewAuction = Pick<Auction, 'currency' | 'startPrice' |'priceStep' | 'collectionId'| 'tokenId' | 'stopAt'>
