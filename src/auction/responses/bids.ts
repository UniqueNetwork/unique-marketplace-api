import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString } from 'class-validator';
import { OfferEntityDto } from '../../offers/dto/offer-dto';

export type BidsWitdrawByOwner = Pick<OfferEntityDto, 'collectionId' | 'tokenId'> & {
  auctionId: string;
  amount: string;
  contractAskId: string;
};

export type BidsWithdraw = {
  leader: Array<BidsWitdrawByOwner>;
  withdraw: Array<BidsWitdrawByOwner>;
};

class BidsWitdrawByOwnerItemDto implements BidsWitdrawByOwner {
  @ApiProperty({ description: 'Collection ID' })
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
  @ApiProperty({
    name: 'leader',
    items: { type: 'BidsWitdrawByOwner', default: '' },
    required: false,
    type: 'array',
    isArray: true,
    example: [
      {
        auctionId: '0dce7bd5-ee2b-4ad1-9918-e8629c3de815',
        amount: '25350',
        contractAskId: '7e215757-97fc-48fb-8e1e-58ab2f15c875',
        collectionId: '16',
        tokenId: '1',
      },
    ],
  })
  leader: Array<BidsWitdrawByOwnerItemDto>;

  @ApiProperty({
    name: 'withdraw',
    items: { type: 'BidsWitdrawByOwner', default: '' },
    required: false,
    type: 'array',
    isArray: true,
    example: [
      [
        {
          auctionId: '0dce7bd5-ee2b-4ad1-9918-e8629c3de815',
          amount: '25350',
          contractAskId: '7e215757-97fc-48fb-8e1e-58ab2f15c875',
          collectionId: '16',
          tokenId: '1',
        },
      ],
    ],
  })
  withdraw: Array<BidsWitdrawByOwnerItemDto>;
}
