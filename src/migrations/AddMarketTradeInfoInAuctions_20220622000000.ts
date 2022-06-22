import {MigrationInterface, QueryRunner} from "typeorm";

export class AddMarketTradeInfoInAuctions_20220622000000 implements MigrationInterface {
    name = 'AddMarketTradeInfoInAuctions_20220622000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE public.market_trade ADD "method" text NULL');
        await queryRunner.query('ALTER TABLE public.market_trade ADD origin_price int8 NULL');
        await queryRunner.query('ALTER TABLE public.market_trade ADD commission int8 NULL');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE public.market_trade DROP COLUMN "method"');
        await queryRunner.query('ALTER TABLE public.market_trade DROP COLUMN origin_price');
        await queryRunner.query('ALTER TABLE public.market_trade DROP COLUMN commission');
    }

}
