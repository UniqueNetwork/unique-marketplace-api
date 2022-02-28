export enum BidStatus {
  created = 'created',
  minting = 'minting',
  finished = 'finished',
  error = 'error',
}

export interface Bid {
  id: string;

  auctionId: string;

  status: BidStatus;

  amount: string;

  balance: string;

  bidderAddress: string;

  createdAt: Date;

  updatedAt: Date;
}
