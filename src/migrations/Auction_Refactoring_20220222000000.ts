import { MigrationInterface, QueryRunner, TableIndex } from 'typeorm';

export class Auction_Refactoring_20220222000000 implements MigrationInterface {
  name = 'Auction_Refactoring_20220222000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('bids', 'UNIQUE_bidder_auction');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createIndex(
      'bids',
      new TableIndex({
        name: 'UNIQUE_bidder_auction',
        isUnique: true,
        columnNames: ['auction_id', 'bidder_address'],
      }),
    );
  }
}
