import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class MoneyTransfer_20211219000000 implements MigrationInterface {
  name = 'Money_Transfer_20211219000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'money_transfer',
        indices: [{ name: 'IX_money_transfer_currency_type_status', columnNames: ['currency', 'type', 'status'] }],
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
          },
          {
            name: 'currency',
            type: 'varchar',
            length: '64',
          },
          {
            name: 'type',
            type: 'varchar',
            length: '32',
          },
          {
            name: 'status',
            type: 'varchar',
            length: '32',
          },
          {
            name: 'amount',
            type: 'bigint',
          },
          {
            name: 'network',
            type: 'varchar',
            length: '16',
          },
          {
            name: 'block_number',
            type: 'bigint',
          },
          {
            name: 'created_at',
            type: 'timestamp without time zone',
          },
          {
            name: 'updated_at',
            type: 'timestamp without time zone',
          },
          {
            name: 'extra',
            type: 'jsonb',
          },
        ],
      }),
      true,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('money_transfer', 'IX_money_transfer_currency_type_status');
    await queryRunner.dropTable('money_transfer', true);
  }
}
