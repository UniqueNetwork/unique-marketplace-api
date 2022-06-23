import {MigrationInterface, QueryRunner} from "typeorm";

export class UpdateSearchIndex1653917562311 implements MigrationInterface {
    name = 'UpdateSearchIndex1653917562311'

    public async up(queryRunner: QueryRunner): Promise<void> {

        await queryRunner.query(`ALTER TABLE "search_index" DROP COLUMN "value"`);
        await queryRunner.query(`ALTER TABLE "search_index" ADD "count_item" smallint`);
        await queryRunner.query(`ALTER TABLE "search_index" ADD "total_items" smallint`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {

        await queryRunner.query(`ALTER TABLE "search_index" DROP COLUMN "total_items"`);
        await queryRunner.query(`ALTER TABLE "search_index" DROP COLUMN "count_item"`);
        await queryRunner.query(`ALTER TABLE "search_index" ADD "value" text`);

    }

}
