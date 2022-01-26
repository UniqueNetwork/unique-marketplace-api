import {MigrationInterface, QueryRunner} from "typeorm";

export class fixAuctionPrice1643133169842 implements MigrationInterface {
    name = 'fixAuctionPrice1643133169842'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "auction" DROP COLUMN "price"`);
        await queryRunner.query(`ALTER TABLE "auction" ALTER COLUMN "current_price" SET DEFAULT '0'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "auction" ALTER COLUMN "current_price" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "auction" ADD "price" bigint NOT NULL`);
    }

}
