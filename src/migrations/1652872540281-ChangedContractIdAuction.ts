import {MigrationInterface, QueryRunner} from "typeorm";

export class ChangedContractIdAuction1652872540281 implements MigrationInterface {
    name = 'ChangedContractIdAuction1652872540281'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "auctions" ALTER COLUMN "contract_ask_id" DROP NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "auctions" ALTER COLUMN "contract_ask_id" SET NOT NULL`);
    }

}
