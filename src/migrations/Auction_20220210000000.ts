import { MigrationInterface, QueryRunner, Table, Raw } from 'typeorm';

import { AuctionStatus, BidStatus } from '../types';

const toEnum = (input: Record<string, string>): string => {
  return Object.values(input)
    .map((v) => `'${v}'`)
    .join(', ');
};

export class Auction_20220210000000 implements MigrationInterface {
  name = 'Auction_20220210000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    const auctionStatuses = toEnum(AuctionStatus);
    const bidStatuses = toEnum(BidStatus);

    await queryRunner.query(`CREATE TYPE  "auction_status_enum" AS ENUM(${auctionStatuses}) `);
    await queryRunner.query(`CREATE TYPE  "bid_status_enum" AS ENUM(${bidStatuses})`);

    await queryRunner.createTable(
      new Table({
        name: 'auctions',
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
            name: 'updated_at',
            type: 'timestamp without time zone',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'price_step',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'start_price',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'status',
            type: 'enum',
            enumName: 'auction_status_enum',
            default: `'${AuctionStatus.created}'`,
          },
          {
            name: 'stop_at',
            type: 'timestamp without time zone',
            isNullable: false,
          },
          {
            name: 'contract_ask_id',
            type: 'uuid',
            isNullable: false,
          },
        ],
        foreignKeys: [
          {
            name: 'FK_auctions_contract_ask_id',
            columnNames: ['contract_ask_id'],
            referencedColumnNames: ['id'],
            referencedTableName: 'contract_ask',
          },
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'bids',
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
            name: 'updated_at',
            type: 'timestamp without time zone',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'amount',
            type: 'varchar',
            isNullable: false,
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
            type: 'boolean',
            name: 'is_withdrawn',
            default: false,
          },
          {
            name: 'status',
            type: 'enum',
            enumName: 'bid_status_enum',
            default: `'${BidStatus.created}'`,
          },
        ],
        foreignKeys: [
          {
            name: 'FK_bids_auctions_id',
            columnNames: ['auction_id'],
            referencedColumnNames: ['id'],
            referencedTableName: 'auctions',
          },
        ],
      }),
      true,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('bids', true);
    await queryRunner.dropTable('auctions', true);

    await queryRunner.query(`DROP TYPE if exists "public"."auction_status_enum" `);
    await queryRunner.query(`DROP TYPE if exists "public"."bid_status_enum" `);
  }
}
