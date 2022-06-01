import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddStatusToCollections_20220601000000 implements MigrationInterface {
  name = 'AddStatusToCollections_20220601000000';

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
