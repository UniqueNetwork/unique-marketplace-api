export enum BidStatus {
  created = 'created',
  minting = 'minting',
  winning = 'winning',
  outbid = 'outbid',
  error = 'error',
}

export interface Bid {
  id: string;

  auctionId: string;

  status: BidStatus;

  amount: string;

  pendingAmount: string;

  bidderAddress: string;

  isWithdrawn: boolean;

  createdAt: Date;

  updatedAt: Date;
}
