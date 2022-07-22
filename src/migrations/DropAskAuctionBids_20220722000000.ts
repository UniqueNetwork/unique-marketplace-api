import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class DropAskAuctionBids_20220722000000 implements MigrationInterface {
  name = 'DropAskAuctionBids_22072200000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`drop view if exists v_auction_bids`);
    await queryRunner.dropTable('bids', true);
    await queryRunner.dropTable('auctions', true);
    await queryRunner.dropTable('contract_ask', true);
  }

  async down(queryRunner: QueryRunner): Promise<void> {}
}
