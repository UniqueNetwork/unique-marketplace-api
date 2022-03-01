import { MigrationInterface, QueryRunner, TableUnique, TableIndex } from 'typeorm';
import {AuctionStatus, BidStatus} from "../auction/types";

export class Auction_Refactoring_20220222000000 implements MigrationInterface {
  name = 'Auction_Refactoring_20220222000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "bids" DROP COLUMN "is_withdrawn"`);
    await queryRunner.query(`ALTER TABLE "bids" DROP COLUMN "pending_amount"`);

    await queryRunner.query(`ALTER TABLE "bids" ADD "block_number" bigint`);

    await queryRunner.dropUniqueConstraint('bids', 'UNIQUE_bidder_auction');

    await queryRunner.createIndex(
      'bids',
      new TableIndex({
        name: 'IX_bidder_auction',
        columnNames: ['auction_id', 'bidder_address'],
      }),
    );

    await queryRunner.query(`ALTER TYPE bid_status_enum ADD VALUE IF NOT EXISTS '${BidStatus.finished}'`);

    await queryRunner.query(`ALTER TYPE auction_status_enum ADD VALUE IF NOT EXISTS '${AuctionStatus.stopped}'`);
    await queryRunner.query(`ALTER TYPE auction_status_enum ADD VALUE IF NOT EXISTS '${AuctionStatus.withdrawing}'`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('bids', 'IX_bidder_auction');

    await queryRunner.createUniqueConstraint(
      'bids',
      new TableUnique({
        name: 'UNIQUE_bidder_auction',
        columnNames: ['auction_id', 'bidder_address'],
      }),
    );

    await queryRunner.query(`ALTER TABLE "bids" DROP COLUMN "block_number"`);

    await queryRunner.query(`ALTER TABLE "bids" ADD "pending_amount" numeric(39,0) NOT NULL DEFAULT '0'`);
    await queryRunner.query(`ALTER TABLE "bids" ADD "is_withdrawn" boolean NOT NULL DEFAULT false`);
  }
}
