export enum AuctionStatus {
  /**
   * before start - minting NFT transfer from owner to market
   */
  created = 'created',

  /**
   * accepting bids
   */
  active = 'active',

  /**
   * no more new bids allowed, waiting last bids to be minted
   */
  stopped = 'stopped',

  /**
   * all bids are minted, choose winner,
   * submit and mint withdrawal transfers, transfer NFT to winner, transfer money to former NFT owner
   */
  withdrawing = 'withdrawing',

  /**
   * everything is done
   */
  ended = 'ended',

  failed = 'failed'
}

export interface Auction {
  id: string;

  status: AuctionStatus;

  startPrice: string;

  priceStep: string;

  stopAt: Date;

  createdAt: Date;

  updatedAt: Date;

  contractAskId?: string;
}
