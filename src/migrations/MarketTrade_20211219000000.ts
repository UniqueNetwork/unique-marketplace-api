import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class MarketTrade_20211219000000 implements MigrationInterface {
    name = 'Market_Trade_20211219000000';

    async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(
            new Table({
                name: 'market_trade',
                columns: [
                    {
                        name: 'id',
                        type: 'uuid',
                        isPrimary: true,
                    },
                    {
                        name: 'collection_id',
                        type: 'bigint',
                    },
                    {
                        name: 'token_id',
                        type: 'bigint',
                    },
                    {
                        name: 'network',
                        type: 'varchar',
                        length: '16',
                    },
                    {
                        name: 'price',
                        type: 'bigint',
                    },
                    {
                        name: 'currency',
                        type: 'varchar',
                        length: '64',
                    },
                    {
                        name: 'address_seller',
                        type: 'varchar',
                        length: '128',
                    },
                    {
                        name: 'address_buyer',
                        type: 'varchar',
                        length: '128',
                    },
                    {
                        name: 'ask_created_at',
                        type: 'timestamp without time zone',
                    },
                    {
                        name: 'buy_created_at',
                        type: 'timestamp without time zone',
                    },
                    {
                        name: 'block_number_ask',
                        type: 'bigint',
                        isNullable: true,
                    },
                    {
                        name: 'block_number_buy',
                        type: 'bigint',
                        isNullable: true,
                    },
                ],
            }),
        );
    }

    async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable('market_trade');
    }
}
