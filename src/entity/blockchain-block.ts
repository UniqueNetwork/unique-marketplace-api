import { Column, Entity, Index } from 'typeorm';

@Index('PK_blockchain_block', ['block_number', 'network'], { unique: true })
@Entity('blockchain_block', { schema: 'public' })
export class BlockchainBlock {
  @Column('bigint', {
    primary: true,
    name: 'block_number',
  })
  block_number: string;

  @Column('varchar', { primary: true, name: 'network', length: 16 })
  network: string;

  @Column('timestamp without time zone', { name: 'created_at' })
  created_at: Date;
}
