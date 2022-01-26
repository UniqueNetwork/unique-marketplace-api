import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Auction, AuctionStatus } from "../types";
import { BidEntity } from "./bid-entity";

@Entity("auction" , { schema: "public"} )
export class AuctionEntity implements Auction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

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

  @Column({
    type: 'bigint',
    nullable: false,
    name: 'token_id',
  })
  tokenId: string;

  @Column({
    type: 'bigint',
    nullable: false,
    name: 'collection_id',
  })
  collectionId: string;

  @Column({
    type: 'varchar',
    length: 64,
    nullable: true,
    name: 'current_price'
  })
  currentPrice: string;

  @Column('varchar', { name: 'currency', length: 64 })
  currency: string;

  @Column({
    type: 'varchar',
    length: 64,
    nullable: false,
    name: 'price_step',
  })
  priceStep: string;

  @Column({
    type: 'varchar',
    length: 64,
    nullable: false,
    name: 'start_price',
  })
  startPrice: string;

  @Column({
    type: "enum",
    enum: AuctionStatus,
    default: AuctionStatus.created
  })
  status: AuctionStatus;

  @Column({
    type: 'timestamp',
    nullable: false,
    name: 'stop_at',
  })
  stopAt: Date;

  @OneToMany(
    () => BidEntity,
    (bid) => bid.auction,
  )
  bids: BidEntity[];
}