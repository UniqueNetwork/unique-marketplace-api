import { ApiProperty } from '@nestjs/swagger';

export class OfferContractAskDto {
    @ApiProperty({ description: 'Collection ID' })
    collectionId: number;
    @ApiProperty({ description: 'Token ID' })
    tokenId: number;
    @ApiProperty({ description: 'Price' })
    price: string;
    @ApiProperty({ description: 'Contract ask currency' })
    quoteId: number;
    @ApiProperty({ description: 'Contract ask from' })
    seller: string;
    @ApiProperty({ description: 'Date blockchain block created' })
    creationDate: Date;
}
