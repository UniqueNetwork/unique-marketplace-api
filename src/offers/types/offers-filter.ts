export type OffersFilterType = {
  offer_id: string;
  offer_status: string;
  offer_type: string;
  collection_id: number;
  token_id: number;
  offer_network: string;
  offer_price: string;
  offer_currency: string;
  offer_address_from: string | null;
  offer_address_to: string | null;
  offer_block_number_ask: string | null;
  offer_block_number_cancel: string | null;
  offer_block_number_buy: string | null;
  auction_id: string | null;
  auction_created_at: Date | null;
  auction_updated_at: Date | null;
  auction_price_step: number | null;
  auction_start_price: number | null;
  auction_status: string | null;
  auction_stop_at: Date | null;
  offer_created_at_ask: Date | null;
};

export type OffersItemType = {
  collectionId: number;
  tokenId: number;
  price: string;
  quoteId: number;
  seller: string;
  creationDate: Date | null;
  [key: string]: any;
};
