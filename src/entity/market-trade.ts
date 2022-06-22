import { Column, Entity, OneToOne } from 'typeorm';
import { SearchIndex } from './search-index';

export enum SellingMethod {
  FixedPrice = 'FixedPrice',
  Auction = 'Auction',
}

@Entity('market_trade', { schema: 'public' })
export class MarketTrade {
  @Column('uuid', { primary: true, name: 'id' })
  id: string;

  @Column('bigint', { name: 'collection_id' })
  collection_id: string;

  @Column('bigint', { name: 'token_id' })
  token_id: string;

  @Column('varchar', { name: 'network', length: 16 })
  network: string;

  @Column('bigint', { name: 'price' })
  price: string;

  @Column('varchar', { name: 'currency', length: 64 })
  currency: string;

  @Column('varchar', { name: 'address_seller', length: 128 })
  address_seller: string;

  @Column('varchar', { name: 'address_buyer', length: 128 })
  address_buyer: string;

  @Column('timestamp without time zone', { name: 'ask_created_at' })
  ask_created_at: Date;

  @Column('timestamp without time zone', { name: 'buy_created_at' })
  buy_created_at: Date;

  @Column('bigint', { name: 'block_number_ask', nullable: true })
  block_number_ask: string;

  @Column('bigint', { name: 'block_number_buy', nullable: true })
  block_number_buy: string;

  @Column({
    type: 'enum',
    enum: SellingMethod,
    name: 'method',
  })
  status?: SellingMethod;

  @Column('bigint', { name: 'origin_price' })
  originPrice?: string;

  @Column('bigint', { name: 'commission' })
  commission?: string;

  @OneToOne(() => SearchIndex)
  search_index: SearchIndex;
}
