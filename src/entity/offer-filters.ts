import { ViewColumn, ViewEntity } from 'typeorm';

@ViewEntity({
  expression:
    `select "offer"."id"                  AS "offer_id", ` +
    `"offer"."status"              AS "offer_status", ` +
    `"offer"."network"             AS "offer_network", ` +
    `"offer"."price"               AS "offer_price", ` +
    `"offer"."currency"            AS "offer_currency", ` +
    `"offer"."address_from"        AS "offer_address_from", ` +
    `"offer"."address_to"          AS "offer_address_to", ` +
    `"offer"."block_number_ask"    AS "offer_block_number_ask", ` +
    `"offer"."block_number_cancel" AS "offer_block_number_cancel", ` +
    `"offer"."block_number_buy"    AS "offer_block_number_buy", ` +
    `"offer"."created_at_ask"      AS "offer_created_at_ask", ` +
    `"offer"."updated_at"          AS "offer_updated_at", ` +
    `"auction"."id"                AS "auction_id", ` +
    `"auction"."created_at"        AS "auction_created_at", ` +
    `"auction"."updated_at"        AS "auction_updated_at", ` +
    `"auction"."price_step"        AS "auction_price_step", ` +
    `"auction"."start_price"       AS "auction_start_price", ` +
    `"auction"."status"            AS "auction_status", ` +
    `"auction"."stop_at"           AS "auction_stop_at", ` +
    `"auction"."contract_ask_id"   AS "auction_contract_ask_id", ` +
    `"auction".bidder_address as "auction_bidder_address", ` +
    `search_filter.* ` +
    `from "public"."contract_ask" "offer" ` +
    `left join (select collection_id, ` +
    `network, ` +
    `token_id, ` +
    `is_trait, ` +
    `locale, ` +
    `unnest(items) traits, ` +
    `key, ` +
    `count_item, ` +
    `total_items, ` +
    `list_items ` +
    `from "public"."search_index" "sf" ` +
    `where "sf"."type" not in ('ImageURL')) "search_filter" ` +
    `on "offer"."network" = search_filter.network and ` +
    `"offer"."collection_id" = search_filter.collection_id and ` +
    `"offer"."token_id" = search_filter.token_id ` +
    `left join "public".v_auction_bids auction ON auction.contract_ask_id = "offer"."id" ` +
    `where "offer"."status" = 'active'`,
  name: 'v_offers_search',
})
export class OfferFilters {
  @ViewColumn({ name: 'offer_id' })
  offerId: string;

  @ViewColumn({ name: 'offer_status' })
  offerStatus: string; // active, canceled, bought

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

  @ViewColumn({ name: 'auction_contract_ask_id' })
  auctionContractAskId: string;

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
