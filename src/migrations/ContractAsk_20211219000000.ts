import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class ContractAsk_20211219000000 implements MigrationInterface {
    name = 'Contract_Ask_20211219000000';

    async up(queryRunner: QueryRunner): Promise<void> {
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
    }

    async down(queryRunner: QueryRunner): Promise<void> {
        for (let idx of ['IX_contract_ask_collection_id_token_id', 'IX_contract_ask_status']) {
            await queryRunner.dropIndex('contract_ask', idx);
        }
        await queryRunner.dropTable('contract_ask');
    }
}
