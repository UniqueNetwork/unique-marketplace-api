import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddStatusToCollections1654573719814 implements MigrationInterface {
  name = 'AddStatusToCollections1654573719814';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'collections',
      new TableColumn({
        name: 'status',
        type: 'enum',
        enum: ['Enabled', 'Disabled'],
        default: "'Enabled'",
      }),
    );
    await queryRunner.addColumn(
      'collections',
      new TableColumn({
        name: 'import_type',
        type: 'enum',
        enum: ['Env', 'Api'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('collections', 'status');
    await queryRunner.dropColumn('collections', 'import_type');
  }
}
