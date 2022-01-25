import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class AccountPairs1639304294000 implements MigrationInterface {
    name = 'Account_Pairs_1639304294000';

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
    }

    async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable('account_pairs');
    }
}
