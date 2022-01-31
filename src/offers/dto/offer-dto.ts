import { ApiProperty } from '@nestjs/swagger';
import { ContractAsk } from "../../entity";
import {Auction, AuctionStatus, Bid, BidStatus} from "../../auction/types";
import { Exclude, Type, plainToInstance, Expose } from 'class-transformer'

class AuctionDto implements Auction {
  @Exclude() id: string;
  @Exclude() createdAt: Date;
  @Exclude() updatedAt: Date;

  @Expose() priceStep: string;
  @Expose() startPrice: string;
  @Expose() status: AuctionStatus;
  @Expose() stopAt: Date;

  @Expose()
  @Type(() => BidDto)
  bids: BidDto[];
}

class BidDto implements Bid {
  @Exclude() id: string;
  @Exclude() auctionId: string;
  @Exclude() isWithdrawn: boolean;
  @Exclude() status: BidStatus;

  @Expose() amount: string;
  @Expose() bidderAddress: string;
}


export class OfferContractAskDto {
    @ApiProperty({ description: 'Collection ID' })
    @Expose()
    collectionId: number;
    @ApiProperty({ description: 'Token ID' })
    @Expose()
    tokenId: number;
    @ApiProperty({ description: 'Price' })
    @Expose()
    price: string;
    @ApiProperty({ description: 'Contract ask currency' })
    @Expose()
    quoteId: number;
    @ApiProperty({ description: 'Contract ask from' })
    @Expose()
    seller: string;
    @ApiProperty({ description: 'Date blockchain block created' })
    @Expose()
    creationDate: Date;

    @ApiProperty({ required: false })
    @Expose()
    @Type(() => AuctionDto)
    auction?: AuctionDto;

    static fromContractAsk(contractAsk: ContractAsk): OfferContractAskDto {
      const plain: Record<string, any> = {
        ...contractAsk,
        collectionId: +contractAsk.collection_id,
        tokenId: +contractAsk.token_id,
        price: contractAsk.price.toString(),
        quoteId: +contractAsk.currency,
        seller: contractAsk.address_from,
        creationDate: contractAsk.created_at,
      };

      return plainToInstance<OfferContractAskDto, Record<string, any>>(
        OfferContractAskDto,
        plain,
        { excludeExtraneousValues: true },
      );
    }
}
