import { IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { OfferContractAskDto } from '../../offers/dto/offer-dto';
import { Type } from 'class-transformer';

export type WithdrawBidQuery = Pick<OfferContractAskDto, 'collectionId' | 'tokenId'> & { timestamp: number };

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
