import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class SearchIndex_20211219000000 implements MigrationInterface {
    name = 'Search_Index_20211219000000';

    async up(queryRunner: QueryRunner): Promise<void> {
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
    }

    async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropIndex('search_index', 'IX_search_index_collection_id_token_id_locale');
        await queryRunner.dropTable('search_index');
    }
}
