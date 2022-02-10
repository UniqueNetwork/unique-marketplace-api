import { Bid } from "../types";
import { IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { OfferContractAskDto } from "../../offers/dto/offer-dto";

type OfferFields = Pick<OfferContractAskDto, 'collectionId' | 'tokenId'>;

type BidFields = Pick<Bid, 'bidderAddress'>;

export type WithdrawBidRequest = OfferFields & BidFields;

export class WithdrawBidRequestDto implements WithdrawBidRequest {
  @ApiProperty()
  collectionId: number;

  @ApiProperty()
  tokenId: number;

  @ApiProperty({ default: 'dummy_address', description: 'get from tx?' })
  @IsString()
  bidderAddress: string;
}
