import {MigrationInterface, QueryRunner} from "typeorm";

export class fixAuctionTypes1643129237903 implements MigrationInterface {
    name = 'fixAuctionTypes1643129237903'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "auction" ADD "price" bigint NOT NULL`);
        await queryRunner.query(`ALTER TABLE "auction" ADD "currency" character varying(64) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "auction" DROP COLUMN "token_id"`);
        await queryRunner.query(`ALTER TABLE "auction" ADD "token_id" bigint NOT NULL`);
        await queryRunner.query(`ALTER TABLE "auction" DROP COLUMN "collection_id"`);
        await queryRunner.query(`ALTER TABLE "auction" ADD "collection_id" bigint NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "auction" DROP COLUMN "collection_id"`);
        await queryRunner.query(`ALTER TABLE "auction" ADD "collection_id" text NOT NULL`);
        await queryRunner.query(`ALTER TABLE "auction" DROP COLUMN "token_id"`);
        await queryRunner.query(`ALTER TABLE "auction" ADD "token_id" text NOT NULL`);
        await queryRunner.query(`ALTER TABLE "auction" DROP COLUMN "currency"`);
        await queryRunner.query(`ALTER TABLE "auction" DROP COLUMN "price"`);
    }

}
