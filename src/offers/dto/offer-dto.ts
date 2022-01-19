import { ApiProperty } from '@nestjs/swagger';

export class OfferDto {
    collectionId: number;
    tokenId: number;
    price: string;
    quoteId: number;
    seller: string;
    metadata: object | null;
    creationDate: Date;
}

export class OfferContractAskDto {
    @ApiProperty({})
    collectionId: number;
    @ApiProperty({})
    tokenId: number;
    @ApiProperty({})
    price: string;
    @ApiProperty({})
    quoteId: number;
    @ApiProperty({})
    seller: string;
    @ApiProperty({})
    creationDate: Date;
}
