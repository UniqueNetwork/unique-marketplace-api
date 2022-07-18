import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Bid, BidStatus } from '../types';
import { OffersEntity } from './offers';

@Entity('auction_bids', { schema: 'public' })
export class AuctionBidEntity implements Bid {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'numeric',
    nullable: false,
    name: 'amount',
  })
  amount: string;

  @Column({
    type: 'numeric',
    nullable: false,
    name: 'balance',
  })
  balance: string;

  @Column({
    type: 'bigint',
    nullable: true,
    name: 'block_number',
  })
  blockNumber: string;

  @Column({
    type: 'uuid',
    nullable: false,
    name: 'auction_id',
  })
  auctionId: string;

  @Column({
    type: 'varchar',
    nullable: false,
    name: 'bidder_address',
  })
  bidderAddress: string;

  @Column({
    type: 'enum',
    enum: BidStatus,
    nullable: false,
    default: BidStatus.minting,
  })
  status: BidStatus;

  @ManyToOne(() => OffersEntity, (auction) => auction.bids)
  @JoinColumn([{ name: 'auction_id', referencedColumnName: 'id' }])
  auction: OffersEntity;

  @Column({
    type: 'timestamp without time zone',
    name: 'created_at',
  })
  createdAt: Date;

  @Column({
    type: 'timestamp without time zone',
    name: 'updated_at',
  })
  updatedAt: Date;
}
