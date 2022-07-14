import { Column, Entity, Index, OneToMany, OneToOne } from 'typeorm';
import { BlockchainBlock } from './blockchain-block';
import { AuctionEntity, BidEntity } from '../auction/entities';
import { SearchIndex } from './search-index';
import { SellingMethod } from './market-trade';
import { AuctionStatus } from '../auction/types';

@Index('IX_offers_id', ['collection_id', 'token_id'])
@Index('IX_offer_status', ['status'])
@Entity('offers', { schema: 'public' })
export class OffersEntity {
  @Column('uuid', { primary: true, name: 'id' })
  id: string;

  @Column({ type: 'enum', enum: SellingMethod, name: 'type' })
  type: SellingMethod;

  @Column('varchar', { name: 'status', length: 16 })
  status: string;

  @Column({ type: 'enum', enum: AuctionStatus, default: AuctionStatus.created, name: 'action' })
  action: AuctionStatus;

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

  @Column('varchar', { name: 'address_from', length: 128 })
  address_from: string;

  @Column('varchar', { name: 'address_to', length: 128 })
  address_to: string;

  @Column({ type: 'numeric', nullable: false, name: 'price_step' })
  priceStep: string;

  @Column({ type: 'numeric', nullable: false, name: 'start_price' })
  startPrice: string;

  @Column({ type: 'timestamp', nullable: false, name: 'stop_at' })
  stopAt: Date;

  @OneToMany(() => BidEntity, (bid) => bid.auction, { cascade: ['insert'] })
  bids: BidEntity[];

  @Column('bigint', { name: 'block_number_ask' })
  block_number_ask: string;

  @Column('bigint', { name: 'block_number_cancel', nullable: true })
  block_number_cancel: string;

  @Column('bigint', { name: 'block_number_buy', nullable: true })
  block_number_buy: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', name: 'created_at_ask' })
  created_at_ask: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP', name: 'updated_at' })
  updated_at: Date;

  @OneToOne(() => BlockchainBlock, (BlockchainBlock) => BlockchainBlock.network)
  created_at: Date;

  @OneToOne(() => SearchIndex)
  search_index: SearchIndex;
}
