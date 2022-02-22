export enum BidStatus {
  created = 'created',
  rejected = 'rejected',
  minting = 'minting',
  finished = 'finished',
  error = 'error',
}

export interface Bid {
  id: string;

  auctionId: string;

  status: BidStatus;

  amount: string;

  bidderAddress: string;

  createdAt: Date;

  updatedAt: Date;
}
