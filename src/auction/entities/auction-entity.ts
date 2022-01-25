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
    type: 'text',
    nullable: false,
    name: 'token_id',
  })
  tokenId: string;

  @Column({
    type: 'text',
    nullable: false,
    name: 'collection_id',
  })
  collectionId: string;

  @Column({
    type: 'bigint',
    nullable: true,
    name: 'current_price'
  })
  currentPrice: bigint;

  @Column({
    type: 'bigint',
    nullable: false,
    name: 'price_step',
  })
  priceStep: bigint;

  @Column({
    type: 'bigint',
    nullable: false,
    name: 'start_price',
  })
  startPrice: bigint;

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