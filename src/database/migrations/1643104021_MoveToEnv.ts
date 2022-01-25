import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class MoveToEvm_164310402100000 implements MigrationInterface {
    name = 'MoveToEvm_164310402100000';

    async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(
            new Table({
                name: 'account_pairs',
                columns: [
                    {
                        name: 'substrate',
                        type: 'varchar',
                        length: '128',
                        isPrimary: true,
                    },
                    {
                        name: 'ethereum',
                        type: 'varchar',
                        length: '128',
                        isPrimary: true,
                    },
                ],
            }),
        );
        await queryRunner.createTable(
            new Table({
                name: 'blockchain_block',
                columns: [
                    {
                        name: 'block_number',
                        type: 'bigint',
                        isPrimary: true,
                    },
                    {
                        name: 'network',
                        type: 'varchar',
                        length: '16',
                        isPrimary: true,
                    },
                    {
                        name: 'created_at',
                        type: 'timestamp without time zone',
                    },
                ],
            }),
        );

        await queryRunner.createTable(
            new Table({
                name: 'nft_transfer',
                indices: [
                    { name: 'IX_nft_transfer_collection_id_token_id', columnNames: ['collection_id', 'token_id'] },
                    { name: 'IX_nft_transfer_network_block_number', columnNames: ['network', 'block_number'] },
                ],
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
                        name: 'address_from',
                        type: 'varchar',
                        length: '128',
                    },
                    {
                        name: 'address_to',
                        type: 'varchar',
                        length: '128',
                    },
                    {
                        name: 'block_number',
                        type: 'bigint',
                    },
                ],
            }),
        );

        await queryRunner.createTable(
            new Table({
                name: 'money_transfer',
                indices: [{ name: 'IX_money_transfer_currency_type_status', columnNames: ['currency', 'type', 'status'] }],
                columns: [
                    {
                        name: 'id',
                        type: 'uuid',
                        isPrimary: true,
                    },
                    {
                        name: 'currency',
                        type: 'varchar',
                        length: '64',
                    },
                    {
                        name: 'type',
                        type: 'varchar',
                        length: '32',
                    },
                    {
                        name: 'status',
                        type: 'varchar',
                        length: '32',
                    },
                    {
                        name: 'amount',
                        type: 'bigint',
                    },
                    {
                        name: 'network',
                        type: 'varchar',
                        length: '16',
                    },
                    {
                        name: 'block_number',
                        type: 'bigint',
                    },
                    {
                        name: 'created_at',
                        type: 'timestamp without time zone',
                    },
                    {
                        name: 'updated_at',
                        type: 'timestamp without time zone',
                    },
                    {
                        name: 'extra',
                        type: 'jsonb',
                    },
                ],
            }),
        );

        await queryRunner.createTable(
            new Table({
                name: 'contract_ask',
                indices: [
                    { name: 'IX_contract_ask_collection_id_token_id', columnNames: ['collection_id', 'token_id'] },
                    { name: 'IX_contract_ask_status', columnNames: ['status'] },
                ],
                columns: [
                    {
                        name: 'id',
                        type: 'uuid',
                        isPrimary: true,
                    },
                    {
                        name: 'status',
                        type: 'varchar',
                        length: '16',
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
                        name: 'address_from',
                        type: 'varchar',
                        length: '128',
                    },
                    {
                        name: 'address_to',
                        type: 'varchar',
                        length: '128',
                    },
                    {
                        name: 'block_number_ask',
                        type: 'bigint',
                    },
                    {
                        name: 'block_number_cancel',
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

        await queryRunner.createTable(
            new Table({
                name: 'search_index',
                indices: [{ name: 'IX_search_index_collection_id_token_id_locale', columnNames: ['collection_id', 'token_id', 'locale'] }],
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
                        name: 'value',
                        type: 'text',
                    },
                    {
                        name: 'is_trait',
                        type: 'boolean',
                        default: "'f'",
                    },
                    {
                        name: 'locale',
                        type: 'varchar',
                        length: '16',
                        isNullable: true,
                    },
                ],
            }),
        );

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
        await queryRunner.dropIndex('search_index', 'IX_search_index_collection_id_token_id_locale');
        await queryRunner.dropTable('search_index');

        for (let idx of ['IX_contract_ask_collection_id_token_id', 'IX_contract_ask_status']) {
            await queryRunner.dropIndex('contract_ask', idx);
        }
        await queryRunner.dropTable('contract_ask');

        await queryRunner.dropIndex('money_transfer', 'IX_money_transfer_currency_type_status');
        await queryRunner.dropTable('money_transfer');

        for (let idx of ['IX_nft_transfer_collection_id_token_id', 'IX_nft_transfer_network_block_number']) {
            await queryRunner.dropIndex('nft_transfer', idx);
        }
        await queryRunner.dropTable('nft_transfer');

        await queryRunner.dropTable('blockchain_block');
        await queryRunner.dropTable('account_pairs');
    }
}
