import { MigrationInterface, QueryRunner } from 'typeorm';

export class FilterSearch_2206280000000 implements MigrationInterface {
  name = 'FilterSearch_2206280000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE VIEW "v_offers_search" AS select "offer"."id"                  AS "offer_id", "offer"."status"              AS "offer_status", "offer"."network"             AS "offer_network", "offer"."price"               AS "offer_price", "offer"."currency"            AS "offer_currency", "offer"."address_from"        AS "offer_address_from", "offer"."address_to"          AS "offer_address_to", "offer"."block_number_ask"    AS "offer_block_number_ask", "offer"."block_number_cancel" AS "offer_block_number_cancel", "offer"."block_number_buy"    AS "offer_block_number_buy", "offer"."created_at_ask"      AS "offer_created_at_ask", "offer"."updated_at"          AS "offer_updated_at", "auction"."id"                AS "auction_id", "auction"."created_at"        AS "auction_created_at", "auction"."updated_at"        AS "auction_updated_at", "auction"."price_step"        AS "auction_price_step", "auction"."start_price"       AS "auction_start_price", "auction"."status"            AS "auction_status", "auction"."stop_at"           AS "auction_stop_at", "auction"."contract_ask_id"   AS "auction_contract_ask_id", "auction".bidder_address as "auction_bidder_address", search_filter.* from "public"."contract_ask" "offer" left join (select collection_id, network, token_id, is_trait, locale, unnest(items) traits, key, count_item, total_items, list_items from "public"."search_index" "sf" where "sf"."type" not in ('ImageURL')) "search_filter" on "offer"."network" = search_filter.network and "offer"."collection_id" = search_filter.collection_id and "offer"."token_id" = search_filter.token_id left join "public".v_auction_bids auction ON auction.contract_ask_id = "offer"."id" where "offer"."status" = 'active'`,
    );
    await queryRunner.query(
      `INSERT INTO "typeorm_metadata"("database", "schema", "table", "type", "name", "value") VALUES (DEFAULT, $1, DEFAULT, $2, $3, $4)`,
      [
        'public',
        'VIEW',
        'v_offers_search',
        'select "offer"."id"                  AS "offer_id", "offer"."status"              AS "offer_status", "offer"."network"             AS "offer_network", "offer"."price"               AS "offer_price", "offer"."currency"            AS "offer_currency", "offer"."address_from"        AS "offer_address_from", "offer"."address_to"          AS "offer_address_to", "offer"."block_number_ask"    AS "offer_block_number_ask", "offer"."block_number_cancel" AS "offer_block_number_cancel", "offer"."block_number_buy"    AS "offer_block_number_buy", "offer"."created_at_ask"      AS "offer_created_at_ask", "offer"."updated_at"          AS "offer_updated_at", "auction"."id"                AS "auction_id", "auction"."created_at"        AS "auction_created_at", "auction"."updated_at"        AS "auction_updated_at", "auction"."price_step"        AS "auction_price_step", "auction"."start_price"       AS "auction_start_price", "auction"."status"            AS "auction_status", "auction"."stop_at"           AS "auction_stop_at", "auction"."contract_ask_id"   AS "auction_contract_ask_id", "auction".bidder_address as "auction_bidder_address", search_filter.* from "public"."contract_ask" "offer" left join (select collection_id, network, token_id, is_trait, locale, unnest(items) traits, key, count_item, total_items, list_items from "public"."search_index" "sf" where "sf"."type" not in (\'ImageURL\')) "search_filter" on "offer"."network" = search_filter.network and "offer"."collection_id" = search_filter.collection_id and "offer"."token_id" = search_filter.token_id left join "public".v_auction_bids auction ON auction.contract_ask_id = "offer"."id" where "offer"."status" = \'active\'',
      ],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "typeorm_metadata" WHERE "type" = $1 AND "name" = $2 AND "schema" = $3`, ['VIEW', 'v_offers_search', 'public']);
    await queryRunner.query(`DROP VIEW "v_offers_search"`);
  }
}
