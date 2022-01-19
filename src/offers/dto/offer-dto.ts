import { ApiProperty } from '@nestjs/swagger';

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
