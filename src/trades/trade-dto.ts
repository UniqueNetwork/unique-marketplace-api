export interface TradeDto {
  collectionId: number;
  tokenId: number;
  price: string;
  quoteId: number;
  seller: string;
  metadata: object | null;
  creationDate: Date;
  buyer: string;
  tradeDate: Date;
}
export class MarketTradeDto {
  collection_id: string;
  token_id: string;
  network: string;
  price: string;
  currency: string;
  address_seller: string;
  address_buyer: string;
  ask_created_at: Date;
  buy_created_at: Date;
  block_number_ask: string;
  block_number_buy: string;
}
