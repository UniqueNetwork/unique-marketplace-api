import { MigrationInterface, QueryRunner } from 'typeorm';

export class ViewOffersFilter_2022062700000000 implements MigrationInterface {
  name = 'ViewOffersFilter_2022062700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`drop view if exists v_offers_search`);
    await queryRunner.query(`drop view if exists v_auction_bids`);
    await queryRunner.query(`create view v_auction_bids as
      select
      _auc.id, _auc.created_at, _auc.updated_at, _auc.price_step, _auc.start_price, _auc.status, _auc.stop_at, _auc.contract_ask_id, _bid.bidder_address
      from auctions _auc
      left join bids _bid on _auc.id = _bid.auction_id
      where _auc.status not in ('failed', 'ended') and _bid.amount > 0`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`drop view v_auction_bids`);
  }
}
