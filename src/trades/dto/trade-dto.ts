import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { IsArray } from 'class-validator';
import { TokenDescriptionDto } from 'src/offers/dto';

/** DTO for Trades */
export class MarketTradeDto {
  @ApiProperty({ description: 'Collection ID' })
  @Expose()
  @Type(() => Number)
  collectionId: number;

  @ApiProperty({ description: 'Price' })
  @Expose()
  @Type(() => String)
  price: string;

  @ApiProperty({ description: 'Seller' })
  @Expose()
  @Type(() => String)
  seller: string;

  @ApiProperty({ description: 'Buyer' })
  @Expose()
  @Type(() => String)
  buyer: string;


  @ApiProperty({ description: 'Quote ID' })
  @Expose()
  @Type(() => Number)
  quoteId: number;

  @ApiProperty({ description: 'Token ID' })
  @Expose()
  @Type(() => Number)
  tokenId: number;

  @ApiProperty({})
  @Expose()
  @Type(() => Date)
  creationDate: Date;

  @ApiProperty({})
  @Expose()
  tradeDate: Date;

  @ApiProperty({ description: 'Token description' })
  @Expose()
  @Type(() => TokenDescriptionDto)
  tokenDescription: TokenDescriptionDto;
}

export class ResponseMarketTradeDto {
  @ApiProperty({})
  page: number;

  @ApiProperty({})
  pageSize: number;

  @ApiProperty({})
  itemsCount: number;

  @ApiProperty({ type: [MarketTradeDto], format: 'array' })
  items: [MarketTradeDto];
}
