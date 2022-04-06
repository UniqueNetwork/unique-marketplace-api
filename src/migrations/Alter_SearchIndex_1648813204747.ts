import {MigrationInterface, QueryRunner} from "typeorm";

export class AlterSearchIndex1648813204747 implements MigrationInterface {
    name = 'AlterSearchIndex1648813204747'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "search_index" ADD "key" character varying(200)`);
        await queryRunner.query(`ALTER TYPE "public"."search_index_type_enum" RENAME TO "search_index_type_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."search_index_type_enum" AS ENUM('ImageURL', 'Enum', 'String', 'Prefix', 'Number')`);
        await queryRunner.query(`ALTER TABLE "search_index" ALTER COLUMN "type" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "search_index" ALTER COLUMN "type" TYPE "public"."search_index_type_enum" USING "type"::"text"::"public"."search_index_type_enum"`);
        await queryRunner.query(`ALTER TABLE "search_index" ALTER COLUMN "type" SET DEFAULT 'String'`);
        await queryRunner.query(`DROP TYPE "public"."search_index_type_enum_old"`);
        await queryRunner.query(`CREATE INDEX "IX_search_index_key" ON "search_index" ("key") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IX_search_index_key"`);
        await queryRunner.query(`CREATE TYPE "public"."search_index_type_enum_old" AS ENUM('ImageURL', 'Enum', 'String', 'Prefix')`);
        await queryRunner.query(`ALTER TABLE "search_index" ALTER COLUMN "type" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "search_index" ALTER COLUMN "type" TYPE "public"."search_index_type_enum_old" USING "type"::"text"::"public"."search_index_type_enum_old"`);
        await queryRunner.query(`ALTER TABLE "search_index" ALTER COLUMN "type" SET DEFAULT 'String'`);
        await queryRunner.query(`DROP TYPE "public"."search_index_type_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."search_index_type_enum_old" RENAME TO "search_index_type_enum"`);
        await queryRunner.query(`ALTER TABLE "search_index" DROP COLUMN "key"`);
  }

}
