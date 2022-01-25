import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class NFTTransfer_20211219000000 implements MigrationInterface {
    name = 'NFT_Transfer_20211219000000';

    async up(queryRunner: QueryRunner): Promise<void> {
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
    }

    async down(queryRunner: QueryRunner): Promise<void> {
        for (let idx of ['IX_nft_transfer_collection_id_token_id', 'IX_nft_transfer_network_block_number']) {
            await queryRunner.dropIndex('nft_transfer', idx);
        }
        await queryRunner.dropTable('nft_transfer');
    }
}
