import {
  IsString,
  IsInt,
  IsPositive,
  IsDate,
  Min,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty } from "@nestjs/swagger";

import { Auction, AuctionStatus, NewAuction } from "../types";

class NewAuctionDto implements NewAuction {
  @ApiProperty({ default: '1' })
  @IsString()
  tokenId: string;

  @ApiProperty({ default: '2' })
  @IsString()
  collectionId: string;

  @ApiProperty({ default: 'OPL' })
  @IsString()
  currency: string;

  @ApiProperty({ type: Number, default: 100 })
  @IsInt()
  @IsPositive()
  @Min(0)
  startPrice: string;

  @ApiProperty({ type: Number, default: 10 })
  @IsInt()
  @Min(1)
  priceStep: string;

  @ApiProperty()
  @Type(() => Date)
  @IsDate()
  stopAt: Date;
}

export class CreateAuctionRequest {
  @ApiProperty()
  @Type(() => NewAuctionDto)
  @ValidateNested()
  auction: NewAuctionDto;

  @ApiProperty()
  @IsString()
  nftTransferTransaction: string;
}

export class CreateAuctionResponse implements Auction {
  @ApiProperty()
  id: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  currentPrice: string;

  @ApiProperty()
  priceStep: string;

  @ApiProperty()
  currency: string;

  @ApiProperty()
  startPrice: string;

  @ApiProperty()
  status: AuctionStatus;

  @ApiProperty()
  stopAt: Date;

  @ApiProperty()
  tokenId: string;

  @ApiProperty()
  collectionId: string;

  @ApiProperty()
  updatedAt: Date;
}
