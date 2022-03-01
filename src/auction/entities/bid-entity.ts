import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Bid, BidStatus } from '../types';
import { AuctionEntity } from './auction-entity';

@Entity('bids', { schema: 'public' })
export class BidEntity implements Bid {
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

  @ManyToOne(() => AuctionEntity, (auction) => auction.bids)
  @JoinColumn([{ name: 'auction_id', referencedColumnName: 'id' }])
  auction: AuctionEntity;

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
