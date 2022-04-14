import { ApiProperty } from "@nestjs/swagger";
import {
  IsNumber,
  IsString,
} from "class-validator";
import { OfferContractAskDto } from "../../offers/dto/offer-dto";

export type BidsWitdrawByOwner = Pick<OfferContractAskDto, 'collectionId' | 'tokenId'>
& {
  auctionId: string;

  amount: string;

  contractAskId: string;
}

export class BidsWitdrawByOwnerDto implements BidsWitdrawByOwner {
  @ApiProperty({description: 'Collection ID'})
  @IsNumber()
  collectionId: number;

  @ApiProperty({ description: 'Token ID' })
  @IsNumber()
  tokenId: number;

  @ApiProperty({ description: 'Auction ID' })
  @IsString()
  auctionId: string;

  @ApiProperty({ description: 'Amount' })
  @IsString()
  amount: string;

  @ApiProperty({ description: 'Contract Id' })
  @IsString()
  contractAskId: string;
}