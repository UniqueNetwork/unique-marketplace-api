import {Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn} from "typeorm";
import { Bid, BidStatus } from "../types";
import { AuctionEntity } from "./auction-entity";

@Entity("bid" , { schema: "public"} )
export class BidEntity implements Bid {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'bigint',
    nullable: false,
  })
  amount: bigint;

  @Column({
    type: 'uuid',
    nullable: false,
    name: 'auction_id',
  })
  auctionId: string;

  @Column({
    type: 'text',
    nullable: false,
    name: 'bidder_address'
  })
  bidderAddress: string;

  @Column({
    type: "enum",
    enum: BidStatus,
    default: BidStatus.created
  })
  status: BidStatus;

  @ManyToOne(
    () => AuctionEntity,
    (auction) => auction.bids,
    { onDelete: "CASCADE" },
  )
  @JoinColumn([{ name: "auctionId", referencedColumnName: "id" }])
  auction: AuctionEntity;

  @Column({
    type: "boolean",
    default: false,
    name: 'is_withdrawn'
  })
  isWithdrawn: boolean;
}