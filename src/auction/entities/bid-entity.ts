import {Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique} from "typeorm";
import { Bid, BidStatus } from "../types";
import { AuctionEntity } from "./auction-entity";

@Unique(
  'UNIQUE_user_auction',
  ['auctionId', 'bidderAddress'],
)
@Entity("bid" , { schema: "public" } )
export class BidEntity implements Bid {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'bigint',
    nullable: false,
  })
  amount: string;

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
  @JoinColumn([{ name: "auction_id", referencedColumnName: "id" }])
  auction: AuctionEntity;

  @Column({
    type: "boolean",
    default: false,
    name: 'is_withdrawn'
  })
  isWithdrawn: boolean;
}