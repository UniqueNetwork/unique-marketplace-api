import { ApiProperty } from '@nestjs/swagger';

export interface TradeDto {
    collectionId: number;
    tokenId: number;
    price: string;
    quoteId: number;
    seller: string;
    metadata: object | null;
    creationDate: Date;
    buyer: string;
    tradeDate: Date;
}

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
