import { ApiProperty } from '@nestjs/swagger';
import { ContractAsk } from '../../entity';
import { Auction, AuctionStatus, Bid, BidStatus, TokenDescription, TypeAttributToken } from '../../auction/types';
import { Exclude, Expose, plainToInstance, Type } from 'class-transformer';

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

  @Expose() createdAt: Date;
  @Expose() updatedAt: Date;
  @Expose() amount: string;
  @Expose() balance: string;
  @Expose() bidderAddress: string;
}

export class TokenDescriptionDto {
  @Expose() collectionName: string;
  @Expose() image: string;
  @Expose() prefix: string;
  @Expose() description: string;
  @Expose() collectionCover: string;
  @Expose() attributes: Array<TokenDescription>
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

  @ApiProperty({ description: 'Token description' })
  @Expose()
  @Type(() => TokenDescriptionDto)
  tokenDescription: TokenDescriptionDto;

  static fromContractAsk(contractAsk: ContractAsk): OfferContractAskDto {
    const plain: Record<string, any> = {
      ...contractAsk,
      collectionId: +contractAsk.collection_id,
      tokenId: +contractAsk.token_id,
      price: contractAsk.price.toString(),
      quoteId: +contractAsk.currency,
      seller: contractAsk.address_from,
      creationDate: contractAsk.created_at
    };

    if (contractAsk?.auction?.bids?.length) {
      contractAsk.auction.bids = contractAsk.auction.bids.sort((a, b) => {
        return b.createdAt.getTime() - a.createdAt.getTime();
      });
    }
    /**
     * tokenDescription: {
  attributes: [{ key, type, value }]// как есть остальное,
  collectionName: string,
  image: string // url
  prefix: string
}
     */
/*     if (Array.isArray(contractAsk?.search_index)) {
      plain.tokenDescription = contractAsk?.search_index.reduce((acc, item) => {
        if (item.type === TypeAttributToken.Prefix) {
          acc.prefix = item.items.pop();
        }
        //TODO: Переделать сборку токена
        if (item.key === 'collectionName') {
          acc.collectionName = item.items.pop();
        }

        if (item.key === 'description') {
          acc.description = item.items.pop();
        }

        if (item.type === TypeAttributToken.ImageURL) {
          const image = String(item.items.pop());
          if ( image.search('ipfs.unique.network') !== -1) {
            acc[`${item.key}`] = image;
          } else {
            if (image) {
              acc[`${item.key}`] = `https://ipfs.unique.network/ipfs/${image}`;
            } else {
              acc[`${item.key}`] = null;
            }
          }
        }

        if ((item.type === TypeAttributToken.String || item.type === TypeAttributToken.Enum) && !['collectionName', 'description'].includes(item.key) ) {
          acc.attributes.push({
            key: item.key,
            value: (item.items.length === 1) ? item.items.pop() : item.items,
            type: item.type
          })
        }
        return acc;
      },{
        attributes: []
      })
    } */

    return plainToInstance<OfferContractAskDto, Record<string, any>>(OfferContractAskDto, plain, { excludeExtraneousValues: true });
  }
}
