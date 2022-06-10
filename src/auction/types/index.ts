export { Auction, AuctionStatus } from './auction';
export { Bid, BidStatus } from './bid';
export { TxInfo, TxArgs } from './tx-info';
export { TokenInfo, CollectionToken, TypeAttributToken, TypeConstSchema, TokenDescription } from './search';

export type CalculateArgs = {
  collectionId: number;
  tokenId: number;
  bidderAddress: string;
};

export type PlaceBidArgs = CalculateArgs & {
  amount: string;
  tx: string;
};

export interface CalculationInfo {
  contractPendingPrice: bigint;
  bidderPendingAmount: bigint;
  minBidderAmount: bigint;
  priceStep: bigint;
}
