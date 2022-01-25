import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class BlockchainBlock1639304294000 implements MigrationInterface {
    name = 'Blockchain_Block_1639304294000';

    async up(queryRunner: QueryRunner): Promise<void> {
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
    }

    async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable('blockchain_block');
    }
}
