export enum AuctionStatus {
  created = 'created',
  active = 'active',
  ended = 'ended',
}

export interface Auction {
  id?: string;

  status?: AuctionStatus;

  startPrice?: string;

  priceStep?: string;

  stopAt?: Date;

  createdAt?: Date;

  updatedAt?: Date;
}
