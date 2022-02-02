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

  bidderAddress: string;

  isWithdrawn: boolean;
}
