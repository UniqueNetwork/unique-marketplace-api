import { MigrationInterface, QueryRunner } from 'typeorm';

export class ConvertOffersAndAuction_20220720300000 implements MigrationInterface {
  name = 'ConvertOffersAndAuction_22072030000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    try {
      await queryRunner.query(
        "INSERT INTO offers ( SELECT ask.ID AS id ,ask.status AS status,CASE WHEN auc.ID NOTNULL THEN 'Auction' ELSE 'FixedPrice' END AS TYPE,ask.collection_id AS collection_id,ask.token_id AS token_id,ask.network AS network,ask.price AS price,ask.currency AS currency,auc.price_step,auc.start_price,auc.status AS status_auction,auc.stop_at AS stop_at,auc.updated_at AS updated_auction,ask.address_from AS address_from,ask.address_to AS address_to,CASE WHEN ask.ID NOTNULL THEN NULL END AS address_contract,CASE WHEN ask.block_number_ask !='-1' THEN ask.block_number_ask END AS block_number_ask,ask.block_number_cancel,ask.block_number_buy,ask.created_at_ask,ask.updated_at,CASE WHEN auc.ID NOTNULL THEN json_build_object('auction_id',auc.ID) ELSE '{}' END AS collection_data FROM contract_ask ask LEFT JOIN auctions auc ON ask.ID=auc.contract_ask_id)",
      );
      await queryRunner.query(
        "INSERT INTO auction_bids (WITH RECURSIVE auctions_data AS (SELECT (offers.collection_data->> 'auction_id') :: uuid AS auction_id,* FROM offers WHERE offers.TYPE='Auction')  SELECT bid.ID,bid.created_at,bid.amount,bid.balance,auc.ID AS auction_id,bid.bidder_address,bid.status,bid.block_number,bid.updated_at FROM bids AS bid LEFT JOIN auctions_data AS auc ON auc.auction_id=bid.auction_id)",
      );
    } catch (e) {
      await queryRunner.rollbackTransaction();
      throw e;
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {}
}
