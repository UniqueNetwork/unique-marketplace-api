import { ApiProperty } from '@nestjs/swagger';
import { OfferContractAskDto } from '../../offers/dto/offer-dto';
import { IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export type CancelAuctionQuery = Pick<OfferContractAskDto, 'collectionId' | 'tokenId'>;

export class CancelAuctionQueryDto implements CancelAuctionQuery {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  collectionId: number;

  @ApiProperty({ example: 2 })
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
