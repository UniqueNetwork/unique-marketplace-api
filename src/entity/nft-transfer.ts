import { Column, Entity, Index } from 'typeorm';

@Index('IX_nft_transfer_collection_id_token_id', ['collection_id', 'token_id'])
@Index('IX_nft_transfer_network_block_number', ['network', 'block_number'])
@Entity('nft_transfer', { schema: 'public' })
export class NFTTransfer {
  @Column('uuid', { primary: true, name: 'id' })
  id: string;

  @Column('bigint', { name: 'collection_id' })
  collection_id: string;

  @Column('bigint', { name: 'token_id' })
  token_id: string;

  @Column('varchar', { name: 'network', length: 16 })
  network: string;

  @Column('varchar', { name: 'address_from', length: 128 })
  address_from: string;

  @Column('varchar', { name: 'address_to', length: 128 })
  address_to: string;

  @Column('bigint', { name: 'block_number' })
  block_number: string;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    name: 'created_at',
  })
  created_at: Date;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
    name: 'updated_at',
  })
  updated_at: Date;
}
