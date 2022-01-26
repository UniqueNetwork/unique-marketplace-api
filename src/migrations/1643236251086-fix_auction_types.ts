import {MigrationInterface, QueryRunner} from "typeorm";

export class fixAuctionTypes1643236251086 implements MigrationInterface {
    name = 'fixAuctionTypes1643236251086'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IX_search_index_collection_id_token_id_locale"`);
        await queryRunner.query(`ALTER TABLE "search_index" ALTER COLUMN "is_trait" SET DEFAULT 'f'`);
        await queryRunner.query(`ALTER TABLE "search_index" DROP COLUMN "locale"`);
        await queryRunner.query(`ALTER TABLE "search_index" ADD "locale" text`);
        await queryRunner.query(`ALTER TABLE "money_transfer" ALTER COLUMN "extra" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "bid" DROP COLUMN "amount"`);
        await queryRunner.query(`ALTER TABLE "bid" ADD "amount" character varying(64) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "auction" DROP COLUMN "current_price"`);
        await queryRunner.query(`ALTER TABLE "auction" ADD "current_price" character varying(64)`);
        await queryRunner.query(`ALTER TABLE "auction" DROP COLUMN "price_step"`);
        await queryRunner.query(`ALTER TABLE "auction" ADD "price_step" character varying(64) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "auction" DROP COLUMN "start_price"`);
        await queryRunner.query(`ALTER TABLE "auction" ADD "start_price" character varying(64) NOT NULL`);
        await queryRunner.query(`CREATE INDEX "IX_search_index_collection_id_token_id_locale" ON "search_index" ("collection_id", "token_id", "locale") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IX_search_index_collection_id_token_id_locale"`);
        await queryRunner.query(`ALTER TABLE "auction" DROP COLUMN "start_price"`);
        await queryRunner.query(`ALTER TABLE "auction" ADD "start_price" bigint NOT NULL`);
        await queryRunner.query(`ALTER TABLE "auction" DROP COLUMN "price_step"`);
        await queryRunner.query(`ALTER TABLE "auction" ADD "price_step" bigint NOT NULL`);
        await queryRunner.query(`ALTER TABLE "auction" DROP COLUMN "current_price"`);
        await queryRunner.query(`ALTER TABLE "auction" ADD "current_price" bigint DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "bid" DROP COLUMN "amount"`);
        await queryRunner.query(`ALTER TABLE "bid" ADD "amount" bigint NOT NULL`);
        await queryRunner.query(`ALTER TABLE "money_transfer" ALTER COLUMN "extra" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "search_index" DROP COLUMN "locale"`);
        await queryRunner.query(`ALTER TABLE "search_index" ADD "locale" character varying(16)`);
        await queryRunner.query(`ALTER TABLE "search_index" ALTER COLUMN "is_trait" SET DEFAULT false`);
        await queryRunner.query(`CREATE INDEX "IX_search_index_collection_id_token_id_locale" ON "search_index" ("collection_id", "token_id", "locale") `);
    }

}