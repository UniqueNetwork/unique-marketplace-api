import { MigrationInterface, QueryRunner } from 'typeorm';

export class ChangeSearchIndex_2022062410510000 implements MigrationInterface {
  name = 'ChangeSearchIndex_2022062410510000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "search_index" DROP COLUMN "value"`);
    await queryRunner.query(`ALTER TABLE "search_index" ADD "count_item" smallint`);
    await queryRunner.query(`ALTER TABLE "search_index" ADD "total_items" smallint`);
    await queryRunner.query(`ALTER TABLE "search_index" ADD "list_items" text array DEFAULT '{}'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "search_index" DROP COLUMN "total_items"`);
    await queryRunner.query(`ALTER TABLE "search_index" DROP COLUMN "count_item"`);
    await queryRunner.query(`ALTER TABLE "search_index" ADD "value" text`);
    await queryRunner.query(`ALTER TABLE "search_index" DROP COLUMN "list_items"`);
  }
}
