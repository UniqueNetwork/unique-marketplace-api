import { Bid } from "../types";
import { IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { OfferContractAskDto } from "../../offers/dto/offer-dto";


type OfferFields = Pick<OfferContractAskDto, 'collectionId' | 'tokenId'>;

type BidFields = Pick<Bid, 'amount' | 'bidderAddress'>;

type BidTransfer = {
  bidTransferTransactionHex: string;
};

export type PlaceBidRequest = OfferFields & BidFields & BidTransfer;

export class PlaceBidRequestDto implements PlaceBidRequest {
  @ApiProperty()
  collectionId: number;

  @ApiProperty()
  tokenId: number;

  @ApiProperty({ default: '11', description: 'get from tx?' })
  amount: string;

  @ApiProperty({ default: 'dummy_address', description: 'get from tx?' })
  bidderAddress: string;

  @ApiProperty()
  @IsString()
  bidTransferTransactionHex: string;
}