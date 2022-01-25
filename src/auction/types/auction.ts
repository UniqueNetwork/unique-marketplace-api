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

  startPrice: bigint;

  priceStep: bigint;

  currentPrice: bigint;

  stopAt: Date;

  createdAt: Date;

  updatedAt: Date;
}

export type NewAuction = Pick<Auction, 'startPrice' |'priceStep' | 'collectionId'| 'tokenId' | 'stopAt'>
