import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Index('IX_tokens_collection_id_token_id', ['collection_id', 'token_id'])
@Entity('tokens', { schema: 'public' })
export class Tokens {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('bigint', { name: 'collection_id' })
  collection_id: string;

  @Column('bigint', { name: 'token_id' })
  token_id: string;

  @Column('varchar', { name: 'owner_token', length: 128, nullable: true })
  owner_token: string;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    name: 'created_at',
  })
  createdAt: Date;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
    name: 'updated_at',
  })
  updatedAt: Date;
}
