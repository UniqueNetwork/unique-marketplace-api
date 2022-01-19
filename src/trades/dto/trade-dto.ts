import { ApiProperty } from '@nestjs/swagger';

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
