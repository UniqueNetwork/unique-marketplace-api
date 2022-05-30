import { CollectionMode } from 'src/collections/types';
import { Column, CreateDateColumn, Entity, UpdateDateColumn } from 'typeorm';

@Entity('collections', { schema: 'public' })
export class Collection {
  @Column('bigint', { name: 'id', primary: true })
  id: string;

  @Column('varchar', { name: 'owner', length: 128 })
  owner: string;

  @Column('enum', { enum: CollectionMode })
  mode: CollectionMode;

  @Column('int', { name: 'decimal_points', default: 0 })
  decimalPoints: number;

  @Column('varchar', { name: 'name', length: 64 })
  name: string;

  @Column('varchar', { name: 'description', length: 256 })
  description: string;

  @Column('varchar', { name: 'token_prefix', length: 16 })
  tokenPrefix: string;

  @Column('boolean', { name: 'mint_mode', default: false })
  mintMode: boolean;

  @Column('varchar', { name: 'allowed_tokens', default: '' })
  allowedTokens: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
