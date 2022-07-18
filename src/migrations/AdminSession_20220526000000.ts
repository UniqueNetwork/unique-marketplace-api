import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class AdminSession_20220526000000 implements MigrationInterface {
  name = 'AdminSession_20220526000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'sessions',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'address',
            type: 'varchar',
            length: '128',
            isNullable: false,
          },
          {
            name: 'substrate_address',
            type: 'varchar',
            length: '128',
            isNullable: false,
          },
          {
            name: 'access_token',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'refresh_token',
            type: 'varchar',
            isNullable: false,
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

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('sessions', true);
  }
}
