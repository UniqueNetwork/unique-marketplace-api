import {MigrationInterface, QueryRunner} from "typeorm";

export class AddedAuctionStatus1652871165080 implements MigrationInterface {
    name = 'AddedAuctionStatus1652871165080'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TYPE "public"."auction_status_enum" RENAME TO "auction_status_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."auctions_status_enum" AS ENUM('created', 'active', 'stopped', 'withdrawing', 'ended', 'failed')`);
        await queryRunner.query(`ALTER TABLE "auctions" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "auctions" ALTER COLUMN "status" TYPE "public"."auctions_status_enum" USING "status"::"text"::"public"."auctions_status_enum"`);
        await queryRunner.query(`ALTER TABLE "auctions" ALTER COLUMN "status" SET DEFAULT 'created'`);
        await queryRunner.query(`DROP TYPE "public"."auction_status_enum_old"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."auction_status_enum_old" AS ENUM('created', 'active', 'stopped', 'withdrawing', 'ended')`);
        await queryRunner.query(`ALTER TABLE "auctions" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "auctions" ALTER COLUMN "status" TYPE "public"."auction_status_enum_old" USING "status"::"text"::"public"."auction_status_enum_old"`);
        await queryRunner.query(`ALTER TABLE "auctions" ALTER COLUMN "status" SET DEFAULT 'created'`);
        await queryRunner.query(`DROP TYPE "public"."auctions_status_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."auction_status_enum_old" RENAME TO "auction_status_enum"`);
    }

}
