import { ArrayMinSize, IsArray, isArray, IsInt, IsNotEmpty, IsString, Min, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { OfferContractAskDto } from '../../offers/dto/offer-dto';
import { Type } from 'class-transformer';

export type WithdrawBidQuery = Pick<OfferContractAskDto, 'collectionId' | 'tokenId'> & { timestamp: number };

export type ItemCollectionToken = Pick<OfferContractAskDto, 'collectionId' | 'tokenId'>;

export type WithdrawBidChosen = {
  timestamp: number;
  sumWithdraw: number;
  withdrawBids: Array<ItemCollectionToken>
}

export type OwnerWithdrawBids = {
  owner: string;
}

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

export class WithdrawBidChosenQueryDto implements WithdrawBidChosen {
  @ApiProperty({ example: 1645449222954 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  timestamp: number;

  @ApiProperty({ example: 500000000 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  sumWithdraw: number;

  @ApiProperty({ example: [{collectionId: 1, tokenId: 2}] })
  @IsArray()
  @ValidateNested({each: true})
  @ArrayMinSize(1)
  withdrawBids: Array<ItemCollectionToken>
}

export class OwnerWithdrawBidQueryDto implements OwnerWithdrawBids {
  @ApiProperty({example: '5DcJgDMWhg6NP3QEvikFnuyjdtXc42YznBiJJWqb93SAmzqq'})
  @Type(() => String)
  @IsString()
  @IsNotEmpty()
  owner: string;
}