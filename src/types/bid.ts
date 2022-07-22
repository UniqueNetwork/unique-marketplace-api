export enum BidStatus {
  error = 'error',
  created = 'created',
  minting = 'minting',
  finished = 'finished',
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
