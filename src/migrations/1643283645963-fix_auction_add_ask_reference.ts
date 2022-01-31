import {MigrationInterface, QueryRunner} from "typeorm";

export class fixAuctionAddAskReference1643283645963 implements MigrationInterface {
    name = 'fixAuctionAddAskReference1643283645963'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "bid" DROP CONSTRAINT "FK_2e00b0f268f93abcf693bb682c6"`);
        await queryRunner.query(`ALTER TABLE "bid" DROP COLUMN "auctionId"`);
        await queryRunner.query(`ALTER TABLE "auction" DROP COLUMN "currency"`);
        await queryRunner.query(`ALTER TABLE "auction" DROP COLUMN "token_id"`);
        await queryRunner.query(`ALTER TABLE "auction" DROP COLUMN "collection_id"`);
        await queryRunner.query(`ALTER TABLE "auction" DROP COLUMN "current_price"`);
        await queryRunner.query(`ALTER TABLE "auction" ADD "contract_ask_id" uuid NOT NULL`);
        await queryRunner.query(`ALTER TABLE "auction" ADD CONSTRAINT "UQ_bf107989ef830736edb27f9e143" UNIQUE ("contract_ask_id")`);
        await queryRunner.query(`ALTER TABLE "bid" DROP COLUMN "amount"`);
        await queryRunner.query(`ALTER TABLE "bid" ADD "amount" bigint NOT NULL`);
        await queryRunner.query(`ALTER TABLE "auction" DROP COLUMN "price_step"`);
        await queryRunner.query(`ALTER TABLE "auction" ADD "price_step" bigint NOT NULL`);
        await queryRunner.query(`ALTER TABLE "auction" DROP COLUMN "start_price"`);
        await queryRunner.query(`ALTER TABLE "auction" ADD "start_price" bigint NOT NULL`);
        await queryRunner.query(`ALTER TABLE "bid" ADD CONSTRAINT "FK_9e594e5a61c0f3cb25679f6ba8d" FOREIGN KEY ("auction_id") REFERENCES "auction"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "bid" ADD CONSTRAINT "UNIQUE_user_auction" UNIQUE ("auction_id", "bidder_address")`);
        await queryRunner.query(`ALTER TABLE "auction" ADD CONSTRAINT "FK_bf107989ef830736edb27f9e143" FOREIGN KEY ("contract_ask_id") REFERENCES "contract_ask"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);

    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "auction" DROP CONSTRAINT "FK_bf107989ef830736edb27f9e143"`);
        await queryRunner.query(`ALTER TABLE "bid" DROP CONSTRAINT "UNIQUE_user_auction"`);
        await queryRunner.query(`ALTER TABLE "bid" DROP CONSTRAINT "FK_9e594e5a61c0f3cb25679f6ba8d"`);
        await queryRunner.query(`ALTER TABLE "auction" DROP COLUMN "start_price"`);
        await queryRunner.query(`ALTER TABLE "auction" ADD "start_price" character varying(64) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "auction" DROP COLUMN "price_step"`);
        await queryRunner.query(`ALTER TABLE "auction" ADD "price_step" character varying(64) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "bid" DROP COLUMN "amount"`);
        await queryRunner.query(`ALTER TABLE "bid" ADD "amount" character varying(64) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "auction" DROP CONSTRAINT "UQ_bf107989ef830736edb27f9e143"`);
        await queryRunner.query(`ALTER TABLE "auction" DROP COLUMN "contract_ask_id"`);
        await queryRunner.query(`ALTER TABLE "auction" ADD "current_price" character varying(64)`);
        await queryRunner.query(`ALTER TABLE "auction" ADD "collection_id" bigint NOT NULL`);
        await queryRunner.query(`ALTER TABLE "auction" ADD "token_id" bigint NOT NULL`);
        await queryRunner.query(`ALTER TABLE "auction" ADD "currency" character varying(64) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "bid" ADD "auctionId" uuid`);
        await queryRunner.query(`ALTER TABLE "bid" ADD CONSTRAINT "FK_2e00b0f268f93abcf693bb682c6" FOREIGN KEY ("auctionId") REFERENCES "auction"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

}
