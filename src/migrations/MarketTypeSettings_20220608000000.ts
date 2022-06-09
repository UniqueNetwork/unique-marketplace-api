import { MigrationInterface, QueryRunner, Table, Raw } from 'typeorm';

import { AuctionStatus, BidStatus } from '../auction/types';

const toEnum = (input: Record<string, string>): string => {
  return Object.values(input)
    .map((v) => `'${v}'`)
    .join(', ');
};

export class MarketTypeSettings_20220608000000 implements MigrationInterface {
  name = 'MarketTypeSettings_20220608000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'settings',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '128',
            isPrimary: true,
          },
          {
            name: 'property',
            type: 'varchar',
          },
        ],
      }),
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('settings');
  }
}
