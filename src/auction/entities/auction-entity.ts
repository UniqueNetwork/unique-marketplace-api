import { Column, Entity, OneToMany, PrimaryGeneratedColumn, OneToOne, JoinColumn } from "typeorm";
import { Auction, AuctionStatus } from "../types";
import { BidEntity } from "./bid-entity";
import { ContractAsk } from "../../entity";

@Entity("auction" , { schema: "public" } )
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
    name: 'price_step',
  })
  priceStep: string;

  @Column({
    type: 'bigint',
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

  @Column({
    name: 'contract_ask_id',
    type: 'uuid',
  })
  contractAskId: string;

  @OneToOne(
    () => ContractAsk,
    (contractAsk) => contractAsk.auction,
    { cascade: ['insert'] },
  )
  @JoinColumn([{ name: "contract_ask_id", referencedColumnName: "id" }])
  contractAsk: ContractAsk;
}