import { Column, Entity, Index, OneToMany, OneToOne } from 'typeorm';
import { BlockchainBlock } from './blockchain-block';
import { SearchIndex } from './search-index';
import { AuctionBidEntity } from './auction-bids-entity';

@Index('IX_offers_id', ['collection_id', 'token_id'])
@Index('IX_offers_status', ['status'])
@Entity('offers', { schema: 'public' })
export class OffersEntity {
  @Column('uuid', { primary: true, name: 'id' })
  id: string;

  @Column({ type: 'varchar', length: 16, name: 'type' })
  type: string;

  @Column('varchar', { name: 'status', length: 16 })
  status: string;

  @Column({ type: 'varchar', length: 16, name: 'status_auction' })
  status_auction: string;

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

  @Column({ type: 'numeric', nullable: false, name: 'price_step' })
  priceStep: string;

  @Column({ type: 'numeric', nullable: false, name: 'start_price' })
  startPrice: string;

  @Column({ type: 'timestamp', nullable: false, name: 'stop_at' })
  stopAt: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', name: 'updated_auction' })
  updated_auction: Date;

  @Column('varchar', { name: 'address_from', length: 128 })
  address_from: string;

  @Column('varchar', { name: 'address_to', length: 128 })
  address_to: string;

  @Column('varchar', { name: 'address_contract', length: 128 })
  address_contract: string;

  @OneToMany(() => AuctionBidEntity, (bid) => bid.auction, { cascade: ['insert'] })
  bids: AuctionBidEntity[];

  @Column('bigint', { name: 'block_number_ask' })
  block_number_ask: string;

  @Column('bigint', { name: 'block_number_cancel', nullable: true })
  block_number_cancel: string;

  @Column('bigint', { name: 'block_number_buy', nullable: true })
  block_number_buy: string;

  @Column('jsonb', { name: 'collection_data', default: {} })
  collection_data: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', name: 'created_at_ask' })
  created_at_ask: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP', name: 'updated_at' })
  updated_at: Date;

  @OneToOne(() => BlockchainBlock, (BlockchainBlock) => BlockchainBlock.network)
  created_at: Date;

  @OneToOne(() => SearchIndex)
  search_index: SearchIndex;
}
