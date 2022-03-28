import { BlockchainBlock } from '../../../src/entity';

export const prepareBlockData  = async (queryBuilder) => {
  await queryBuilder
    .insert()
    .values([
      {
        block_number: 11011,
        network: 'testnet',
        created_at: '2021-02-01 20:18:01.135',
      },
      {
        block_number: 10011,
        network: 'testnet',
        created_at: '2021-02-01 20:18:01.135',
      },
      {
        block_number: 9011,
        network: 'testnet',
        created_at: '2021-02-01 20:18:01.135',
      },
      {
        block_number: 8011,
        network: 'testnet',
        created_at: '2021-07-01 14:12:06.955',
      },
      {
        block_number: 7011,
        network: 'testnet',
        created_at: '2021-07-01 14:12:06.955',
      },
      {
        block_number: 6011,
        network: 'testnet',
        created_at: '2021-06-01 11:22:17.732',
      },
      {
        block_number: 5011,
        network: 'testnet',
        created_at: '2021-05-01 20:18:01.135',
      },
      {
        block_number: 4011,
        network: 'testnet',
        created_at: '2021-04-01 20:18:01.135',
      },
      {
        block_number: 3011,
        network: 'testnet',
        created_at: '2021-03-01 20:18:01.135',
      },
      {
        block_number: 2011,
        network: 'testnet',
        created_at: '2021-02-01 20:18:01.135',
      },
      {
        block_number: 1011,
        network: 'testnet',
        created_at: '2021-02-01 20:18:01.135',
      }
    ])
    .into(BlockchainBlock)
    .execute()
}