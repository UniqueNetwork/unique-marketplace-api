import { MigrationInterface, QueryRunner, TableColumn, TableIndex } from 'typeorm';
import { ASK_STATUS } from '../escrow/constants';

const buildAlterToNumeric = (table: string, column: string) => {
  return (
    `ALTER TABLE public.${table} ALTER COLUMN ${column} TYPE NUMERIC(39) ` +
    `USING TO_NUMBER(${column}, '999999999999999999999999999999999999999');`
  );
};

export class Auction_Constraints_20220215000000 implements MigrationInterface {
  name = 'Auction_Constraints_20220215000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createIndex(
      'contract_ask',
      new TableIndex({
        name: 'UNIQUE_active_contract_ask',
        isUnique: true,
        columnNames: ['collection_id', 'token_id'],
        where: `(status NOT IN('${ASK_STATUS.CANCELLED}', '${ASK_STATUS.BOUGHT}'));`,
      }),
    );

    await queryRunner.addColumn(
      'bids',
      new TableColumn({
        name: 'pending_amount',
        default: '0',
        isNullable: false,
        type: 'numeric(39)',
      }),
    );

    await queryRunner.query(`ALTER TABLE contract_ask ALTER COLUMN price TYPE NUMERIC(39);`);
    await queryRunner.query(buildAlterToNumeric('auctions', 'start_price'));
    await queryRunner.query(buildAlterToNumeric('auctions', 'price_step'));
    await queryRunner.query(buildAlterToNumeric('bids', 'amount'));
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE bids ALTER COLUMN amount TYPE varchar;');
    await queryRunner.query('ALTER TABLE auctions ALTER COLUMN start_price TYPE varchar;');
    await queryRunner.query('ALTER TABLE auctions ALTER COLUMN price_step TYPE varchar;');
    await queryRunner.query('ALTER TABLE contract_ask ALTER COLUMN price TYPE bigint;');

    await queryRunner.dropColumn('bids', 'pending_amount');
  }
}
