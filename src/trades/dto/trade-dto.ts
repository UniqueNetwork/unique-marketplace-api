import { ApiProperty } from '@nestjs/swagger';
import { IsArray } from 'class-validator';

/** DTO for Trades */
export class MarketTradeDto {
    @ApiProperty({})
    collectionId: number;

    @ApiProperty({})
    price: string;

    @ApiProperty({})
    seller: string;

    @ApiProperty({})
    buyer: string;

    @ApiProperty({})
    quoteId: number;

    @ApiProperty({})
    tokenId: number;

    @ApiProperty({})
    creationDate: Date;

    @ApiProperty({})
    tradeDate: Date;
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
