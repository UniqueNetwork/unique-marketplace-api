import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { OfferEntityDto } from '../../offers/dto/offer-dto';
import { Type } from 'class-transformer';

export type WithdrawBidQuery = Pick<OfferEntityDto, 'collectionId' | 'tokenId'> & { timestamp: number };

export type ItemAuctionId = {
  auctionId: string;
};

export type WithdrawBidChosen = {
  timestamp: number;
  auctionId: Array<ItemAuctionId>;
};

export type OwnerWithdrawBids = {
  owner: string;
};

// todo - unite with CancelAuctionRequest entity?
export class WithdrawBidQueryDto implements WithdrawBidQuery {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  collectionId: number;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  tokenId: number;

  @ApiProperty({ example: 1645449222954 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  timestamp: number;
}

export class ItemCollectionTokenDto implements ItemAuctionId {
  @IsString()
  @Type(() => String)
  auctionId: string;
}

export class WithdrawBidChosenQueryDto {
  @ApiProperty({ example: 1645449222954 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  timestamp: number;

  @ApiProperty({
    name: 'auctionId',
    items: {
      type: 'string',
      default: '',
    },
    minItems: 1,
    required: true,
    type: 'array',
    isArray: true,
  })
  //@ValidateNested({each: true})
  auctionId: Array<string>;
}

export class OwnerWithdrawBidQueryDto implements OwnerWithdrawBids {
  @ApiProperty({ example: '5DcJgDMWhg6NP3QEvikFnuyjdtXc42YznBiJJWqb93SAmzqq' })
  @Type(() => String)
  @IsString()
  @IsNotEmpty()
  owner: string;
}
