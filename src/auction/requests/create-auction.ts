import {
  IsDate,
  IsString,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty } from "@nestjs/swagger";

import { Auction } from "../types";
import { ContractAsk } from "../../entity";



type OfferFields = Pick<ContractAsk, 'collection_id' | 'token_id' | 'currency'>;

type AuctionFields = Pick<Auction, 'startPrice' | 'priceStep' | 'stopAt'>;

type TokenTransfer = {
  tokenTransferTransactionHex: string;
};

export type CreateAuctionRequest = OfferFields & AuctionFields & TokenTransfer;

export class CreateAuctionRequestDto implements CreateAuctionRequest {
  @ApiProperty({ default: '1', description: 'get from tx?' })
  collection_id: string;

  @ApiProperty({ default: '2', description: 'get from tx?' })
  token_id: string;

  @ApiProperty({ default: 'OPZ' })
  currency: string;

  @ApiProperty({ type: Number, default: 100 })
  startPrice: string;

  @ApiProperty({ type: Number, default: 10 })
  priceStep: string;

  @ApiProperty()
  @Type(() => Date)
  @IsDate()
  stopAt: Date;

  @ApiProperty()
  @IsString()
  tokenTransferTransactionHex: string;
}
