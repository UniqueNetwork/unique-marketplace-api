import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class Auction_Bid_total_amount_20220228000000 implements MigrationInterface {
  name = 'Auction_Bid_total_amount_20220228000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'bids',
      new TableColumn({
        name: 'balance',
        isNullable: false,
        type: 'numeric(39)',
        default: '0',
      }),
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "bids" DROP COLUMN "balance"`);
  }
}
