import { ViewColumn, ViewEntity } from 'typeorm';

@ViewEntity({
  expression: ` SELECT DISTINCT offer.id AS offer_id,
    offer.status AS offer_status,
    offer.type AS offer_type,
    offer.network AS offer_network,
    offer.price AS offer_price,
    offer.currency AS offer_currency,
    offer.address_from AS offer_address_from,
    offer.address_to AS offer_address_to,
    offer.block_number_ask AS offer_block_number_ask,
    offer.block_number_cancel AS offer_block_number_cancel,
    offer.block_number_buy AS offer_block_number_buy,
    offer.created_at_ask AS offer_created_at_ask,
    offer.updated_at AS offer_updated_at,
    offer.id AS auction_id,
    offer.created_at_ask AS auction_created_at,
    offer.updated_auction AS auction_updated_at,
    offer.price_step AS auction_price_step,
    offer.start_price AS auction_start_price,
    offer.status AS auction_status,
    offer.stop_at AS auction_stop_at,
    bid.bidder_address AS auction_bidder_address,
    search_filter.collection_id,
    search_filter.network,
    search_filter.token_id,
    search_filter.is_trait,
    search_filter.locale,
    search_filter.traits,
    search_filter.key,
    search_filter.count_item,
    search_filter.total_items,
    search_filter.list_items
   FROM offers offer
     LEFT JOIN ( SELECT sf.collection_id,
            sf.network,
            sf.token_id,
            sf.is_trait,
            sf.locale,
            unnest(sf.items) AS traits,
            sf.key,
            sf.count_item,
            sf.total_items,
            sf.list_items
           FROM search_index sf
          WHERE sf.type <> 'ImageURL'::search_index_type_enum) search_filter ON offer.network::text = search_filter.network::text AND offer.collection_id = search_filter.collection_id AND offer.token_id = search_filter.token_id
     LEFT JOIN auction_bids bid ON bid.auction_id = offer.id`,
  name: 'v_offers_search',
})
export class OfferFilters {
  @ViewColumn({ name: 'offer_id' })
  offerId: string;

  @ViewColumn({ name: 'offer_status' })
  offerStatus: string; // active, canceled, bought

  @ViewColumn({ name: 'offer_type' })
  offerType: string; // Fixed, Auction

  @ViewColumn({ name: 'offer_network' })
  offerNetwork: string;

  @ViewColumn({ name: 'offer_price' })
  offerPrice: string;

  @ViewColumn({ name: 'offer_currency' })
  offerCurrency: string;

  @ViewColumn({ name: 'offer_address_from' })
  offerAddressFrom: string; // address from

  @ViewColumn({ name: 'offer_address_to' })
  offerAddressTo: string; // address to

  @ViewColumn({ name: 'offer_block_number_ask' })
  offerBlockNumberAsk: string;

  @ViewColumn({ name: 'offer_block_number_cancel' })
  offerBlockNumberCancel: string;

  @ViewColumn({ name: 'offer_block_number_buy' })
  offerBlockNumberBuy: string;

  @ViewColumn({ name: 'offer_created_at_ask' })
  offerCreatedAtAsk: Date;

  @ViewColumn({ name: 'offer_updated_at' })
  offerUpdatedAt: Date;

  @ViewColumn({ name: 'auction_id' })
  auctionId: string;

  @ViewColumn({ name: 'auction_created_at' })
  auctionCreatedAt: Date;

  @ViewColumn({ name: 'auction_updated_at' })
  auctionUpdatedAt: Date;

  @ViewColumn({ name: 'auction_price_step' })
  auctionPriceStep: string;

  @ViewColumn({ name: 'auction_start_price' })
  auctionStartPrice: string;

  @ViewColumn({ name: 'auction_status' })
  auctionStatus: string; // created, active, stopped, withdrawing, ended

  @ViewColumn({ name: 'auction_stop_at' })
  auctionStopAt: Date;

  @ViewColumn({ name: 'auction_bidder_address' })
  auctionBidderAddress: string;

  @ViewColumn({ name: 'collection_id' })
  collectionId: number; // collection id from search_index

  @ViewColumn({ name: 'network' })
  network: string;

  @ViewColumn({ name: 'token_id' })
  tokenId: number; // token id from search_index

  @ViewColumn({ name: 'is_trait' })
  isTrait: boolean;

  @ViewColumn({ name: 'locale' })
  locale: string;

  @ViewColumn({ name: 'traits' })
  traits: string;

  @ViewColumn({ name: 'key' })
  key: string;

  @ViewColumn({ name: 'count_item' })
  countItem: number;

  @ViewColumn({ name: 'total_items' })
  totalItems: number;

  @ViewColumn({ name: 'list_items' })
  listItems: string[];
}
