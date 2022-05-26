import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('sessions', { schema: 'public' })
export class AdminSessionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('varchar', { name: 'address', length: 128 })
  address: string;

  @Column('varchar', { name: 'substrate_address', length: 128 })
  substrate_address: string;

  @Column('varchar', { name: 'access_token' })
  access_token: string;

  @Column('varchar', { name: 'refresh_token' })
  refresh_token: string;

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
