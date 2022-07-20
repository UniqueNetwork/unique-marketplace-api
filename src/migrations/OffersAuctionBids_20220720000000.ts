import { MigrationInterface, QueryRunner, Table } from 'typeorm';
import { BidStatus } from '../types';

export class OffersAuctionBids_20220719150000 implements MigrationInterface {
  name = 'OffersAuctionBids_22071915000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'auction_bids',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'created_at',
            type: 'timestamp without time zone',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'amount',
            type: 'numeric(39)',
            isNullable: false,
            default: '0',
          },
          {
            name: 'balance',
            isNullable: false,
            type: 'numeric(39)',
            default: '0',
          },
          {
            name: 'auction_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'bidder_address',
            type: 'varchar',
            isNullable: false,
            length: '128',
          },
          {
            name: 'status',
            type: 'enum',
            enumName: 'bid_status_enum',
            default: `'${BidStatus.created}'`,
          },
          {
            name: 'block_number',
            type: 'bigint',
            isNullable: true,
          },

          {
            name: 'updated_at',
            type: 'timestamp without time zone',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
        foreignKeys: [
          {
            name: 'FK_bids_offers_id',
            columnNames: ['auction_id'],
            referencedColumnNames: ['id'],
            referencedTableName: 'offers',
          },
        ],
      }),
      true,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('auction_bids', true);
    await queryRunner.query(`DROP TYPE if exists "public"."bid_status_enum" `);
  }
}
