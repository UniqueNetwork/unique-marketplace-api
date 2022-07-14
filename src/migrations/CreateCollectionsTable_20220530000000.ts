import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateCollectionsTable_20220530000000 implements MigrationInterface {
  name = 'CreateCollectionsTable_20220530000000';
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'collections',
        columns: [
          {
            name: 'id',
            type: 'bigint',
            isPrimary: true,
          },
          {
            name: 'owner',
            type: 'varchar',
            length: '128',
            isNullable: true,
          },
          {
            name: 'mode',
            type: 'enum',
            enum: ['NFT', 'Fungible', 'ReFungible'],
            isNullable: true,
          },
          {
            name: 'decimal_points',
            type: 'int',
            default: 0,
          },
          {
            name: 'name',
            type: 'varchar',
            length: '64',
            isNullable: true,
          },
          {
            name: 'description',
            type: 'varchar',
            length: '256',
            isNullable: true,
          },
          {
            name: 'token_prefix',
            type: 'varchar',
            length: '16',
            isNullable: true,
          },
          {
            name: 'mint_mode',
            type: 'boolean',
            default: false,
          },
          {
            name: 'allowed_tokens',
            type: 'varchar',
            default: "''",
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['Enabled', 'Disabled'],
            default: "'Enabled'",
          },
          {
            name: 'import_type',
            type: 'enum',
            enum: ['Env', 'Api'],
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
        ],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('collections', true);
  }
}
