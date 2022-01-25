import { Bid, BidStatus, NewBid } from "../types";
import {
  IsString,
  IsInt,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty } from "@nestjs/swagger";


export class NewBidDto implements NewBid {
  @ApiProperty({ type: Number })
  @IsInt()
  amount: string;

  @ApiProperty()
  @IsString()
  auctionId: string;

  @ApiProperty()
  @IsString()
  bidderAddress: string;
}

export class PlaceBidRequest {
  @ApiProperty()
  @Type(() => NewBidDto)
  @ValidateNested()
  bid: NewBidDto;

  @ApiProperty()
  @IsString()
  balanceTransferTransaction: string;
}

export class PlaceBidResponse implements Bid {
  @ApiProperty()
  amount: string;

  @ApiProperty()
  auctionId: string;

  @ApiProperty()
  bidderAddress: string;

  @ApiProperty()
  id: string;

  @ApiProperty()
  isWithdrawn: boolean;

  @ApiProperty()
  status: BidStatus;
}