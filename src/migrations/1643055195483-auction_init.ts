import { MigrationInterface, QueryRunner } from "typeorm";

export class auctionInit1643055195483 implements MigrationInterface {
    name = 'auctionInit1643055195483'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."bid_status_enum" AS ENUM('created', 'minting', 'winning', 'outbid', 'error')`);
        await queryRunner.query(`CREATE TABLE "bid" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "amount" bigint NOT NULL, "auction_id" uuid NOT NULL, "bidder_address" text NOT NULL, "status" "public"."bid_status_enum" NOT NULL DEFAULT 'created', "is_withdrawn" boolean NOT NULL DEFAULT false, "auctionId" uuid, CONSTRAINT "PK_public.bid" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."auction_status_enum" AS ENUM('created', 'active', 'ended')`);
        await queryRunner.query(`CREATE TABLE "auction" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "token_id" text NOT NULL, "collection_id" text NOT NULL, "current_price" bigint, "price_step" bigint NOT NULL, "start_price" bigint NOT NULL, "status" "public"."auction_status_enum" NOT NULL DEFAULT 'created', "stop_at" TIMESTAMP NOT NULL, CONSTRAINT "PK_public.auction" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "bid" ADD CONSTRAINT "FK_2e00b0f268f93abcf693bb682c6" FOREIGN KEY ("auctionId") REFERENCES "auction"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "bid" DROP CONSTRAINT "FK_2e00b0f268f93abcf693bb682c6"`);
        await queryRunner.query(`DROP TABLE "auction"`);
        await queryRunner.query(`DROP TYPE "public"."auction_status_enum"`);
        await queryRunner.query(`DROP TABLE "bid"`);
        await queryRunner.query(`DROP TYPE "public"."bid_status_enum"`);
    }
}
