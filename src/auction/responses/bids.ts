import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
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

export type BidsWithdraw = {
  leader: Array<BidsWitdrawByOwner>,
  withdraw: Array<BidsWitdrawByOwner>
};

class BidsWitdrawByOwnerItemDto implements BidsWitdrawByOwner {
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

export class BidsWitdrawByOwnerDto implements BidsWithdraw {
  @ApiProperty({ name: 'leader',
    items: { type: 'BidsWitdrawByOwner', default: '' },
    required: false, type: 'array', isArray: true
  })
  leader: Array<BidsWitdrawByOwnerItemDto>

  @ApiProperty({ name: 'withdraw',
    items: { type: 'BidsWitdrawByOwner', default: '' },
    required: false, type: 'array', isArray: true
  })
  withdraw: Array<BidsWitdrawByOwnerItemDto>;
}