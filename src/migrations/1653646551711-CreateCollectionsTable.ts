import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateCollectionsTable1653646551711 implements MigrationInterface {
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
          },
          {
            name: 'mode',
            type: 'enum',
            enum: ['NFT', 'Fungible', 'ReFungible'],
          },
          {
            name: 'decimal_points',
            type: 'int',
            isNullable: false,
            default: 0,
          },
          {
            name: 'name',
            type: 'varchar',
            length: '64',
          },
          {
            name: 'description',
            type: 'varchar',
            length: '256',
          },
          {
            name: 'token_prefix',
            type: 'varchar',
            length: '16',
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
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('collections');
  }
}
