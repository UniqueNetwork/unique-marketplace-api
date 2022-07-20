import { MigrationInterface, QueryRunner, Table } from 'typeorm';
import { AuctionStatus, SellingMethod } from '../types';

export class Offers_2022071900000000 implements MigrationInterface {
  name = 'Offers_22071900000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'offers',
        indices: [
          { name: 'IX_offers_id', columnNames: ['id'] },
          { name: 'IX_offers_status', columnNames: ['status'] },
        ],
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '16',
          },
          {
            name: 'type',
            type: 'varchar',
            length: '16',
          },

          {
            name: 'collection_id',
            type: 'bigint',
          },
          {
            name: 'token_id',
            type: 'bigint',
          },
          {
            name: 'network',
            type: 'varchar',
            length: '16',
          },
          {
            name: 'price',
            type: 'bigint',
          },
          {
            name: 'currency',
            type: 'varchar',
            length: '64',
          },
          {
            name: 'price_step',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'start_price',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'status_auction',
            type: 'varchar',
            length: '16',
            isNullable: true,
          },
          {
            name: 'stop_at',
            type: 'timestamp without time zone',
            isNullable: true,
          },
          {
            name: 'updated_auction',
            type: 'timestamp without time zone',
            default: 'CURRENT_TIMESTAMP',
            isNullable: true,
          },
          {
            name: 'address_from',
            type: 'varchar',
            length: '128',
          },
          {
            name: 'address_to',
            type: 'varchar',
            length: '128',
            isNullable: true,
          },
          {
            name: 'address_contract',
            type: 'varchar',
            length: '128',
            isNullable: true,
          },
          {
            name: 'block_number_ask',
            type: 'bigint',
            isNullable: true,
          },
          {
            name: 'block_number_cancel',
            type: 'bigint',
            isNullable: true,
          },
          {
            name: 'block_number_buy',
            type: 'bigint',
            isNullable: true,
          },
          {
            name: 'created_at_ask',
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
            name: 'collection_data',
            type: 'jsonb',
            isNullable: false,
            default: "'{}'",
          },
        ],
      }),
      true,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    for (let idx of ['IX_offers_id', 'IX_offers_status']) {
      await queryRunner.dropIndex('offers', idx);
    }
    await queryRunner.dropTable('offers', true);
  }
}
