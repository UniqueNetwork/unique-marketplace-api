import { Column, Entity, Index } from 'typeorm';

@Index('IX_money_transfer_currency_type_status', ['currency', 'type', 'status'])
@Entity('money_transfer', { schema: 'public' })
export class MoneyTransfer {
  @Column('uuid', { primary: true, name: 'id' })
  id: string;

  @Column('varchar', { name: 'currency', length: 64 })
  currency: string;

  @Column('varchar', { name: 'type', length: 32 })
  type: string;

  @Column('varchar', { name: 'status', length: 32 })
  status: string;

  @Column('bigint', { name: 'amount' })
  amount: string;

  @Column('varchar', { name: 'network', length: 16 })
  network: string;

  @Column('bigint', { name: 'block_number' })
  block_number: string;

  @Column('timestamp without time zone', { name: 'created_at' })
  created_at: Date;

  @Column('timestamp without time zone', { name: 'updated_at' })
  updated_at: Date;

  @Column('jsonb', { name: 'extra', nullable: true })
  extra: any;
}
