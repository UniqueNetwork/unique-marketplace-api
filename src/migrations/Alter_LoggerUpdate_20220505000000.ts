import {MigrationInterface, QueryRunner} from "typeorm";

export class Alter_LoggerUpdate_20220505000000 implements MigrationInterface {
    name = 'Alter_LoggerUpdate_20220505000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "contract_ask" ADD COLUMN "created_at_ask" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "contract_ask" ADD COLUMN "updated_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "nft_transfer" ADD COLUMN "created_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "nft_transfer" ADD COLUMN "updated_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
    }

}
