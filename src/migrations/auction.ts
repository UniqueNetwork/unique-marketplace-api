import { Table, MigrationInterface, QueryRunner } from 'typeorm';

export class Auction implements MigrationInterface {

  async up(queryRunner: QueryRunner): Promise<void> {

    // Auctions
    await queryRunner.createTable(
      new Table({
        name: 'auctions',
        indices: [
          {
            name: 'IX_auctions_token_id_collection_id',
            columnNames: ['token_id', 'colleciton_id']
          }
        ],
        columns: [
          {
            name: 'id',
            type: 'bigint',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment'
          },
          {
            name: 'token_id',
            type: 'bigint'
          },
          {
            name: 'collection_id',
            type: 'bigint'
          },
          {
            name: 'price',
            type: 'varchar',
            length: '128'
          },
          {
            name: 'step',
            type: 'varchar',
            length: '128'
          },
          {
            name: 'start_date',
            type: 'timestamp without time zone'
          },
          {
            name: 'end_date',
            type: 'timestamp without time zone'
          }
        ]
      })
    )

    // Stakes
    await queryRunner.createTable(
      new Table({
        name: 'stakes',
        indices: [
          {
            name: 'IX_stakes_action_id',
            columnNames: ['action_id']
          },
          {
            name: 'IX_stakes_address_action_id',
            columnNames: ['address', 'action_id']
          }
        ],
        columns: [
          {
            name: 'id',
            type: 'bigint',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment'
          },
          {
            name: 'action_id',
            type: 'bigint'
          },
          {
            name: 'price',
            type: 'varchar',
            length: '128'
          },
          {
            name: 'address',
            type: 'varchar',
            length: '128'
          },
          {
            name: 'stake_date',
            type: 'timestamp without time zone'
          }
        ]
      })
    )

    await queryRunner.createTable(
      new Table({
        name: 'events_auction',
        columns: [
          {
            name: 'id',
            type: 'bigint',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment'
          }
        ]
      })
    )
  }
  async  down(queryRunner: QueryRunner): Promise<void> {

    await queryRunner.dropTable('auctions');

    await queryRunner.dropTable('stakes');

    await queryRunner.dropTable('events_auction');

  }

}