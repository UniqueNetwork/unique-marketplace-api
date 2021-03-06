import { ApiProperty } from '@nestjs/swagger';
import { ContractAsk } from '../../entity';
import { Auction, AuctionStatus, Bid, BidStatus, TokenDescription } from '../../auction/types';
import { Exclude, Expose, plainToInstance, Type } from 'class-transformer';

class AuctionDto implements Auction {
  @Exclude() id: string;
  @Exclude() createdAt: Date;
  @Exclude() updatedAt: Date;

  @Expose() @ApiProperty({ example: '10' }) priceStep: string;
  @Expose() @ApiProperty({ example: '100' }) startPrice: string;
  @Expose() @ApiProperty({ example: 'active' }) status: AuctionStatus;
  @Expose() @ApiProperty({ example: '2022-06-24T14:32:00.833Z' }) stopAt: Date;

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
  @Expose() @ApiProperty({ example: 'Test' }) collectionName: string;
  @Expose() image: string;
  @Expose() @ApiProperty({ example: 'TEST' }) prefix: string;
  @Expose() @ApiProperty({ example: 'Test collection' }) description: string;
  @Expose() collectionCover: string;
  @Expose() attributes: Array<TokenDescription>;
}

export class OfferContractAskDto {
  @ApiProperty({ description: 'Collection ID', example: 16 })
  @Expose()
  collectionId: number;
  @ApiProperty({ description: 'Token ID', example: 4 })
  @Expose()
  tokenId: number;
  @ApiProperty({ description: 'Price', example: '100' })
  @Expose()
  price: string;
  @ApiProperty({ description: 'Contract ask currency', example: 0 })
  @Expose()
  quoteId: number;
  @ApiProperty({ description: 'Contract ask from', example: '5CfC8HRcV5Rc4jHFHmZsSjADCMYc7zoWbvxdoNG9qwEP7aUB' })
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
      creationDate: contractAsk.created_at,
    };

    if (contractAsk?.auction?.bids?.length) {
      contractAsk.auction.bids = contractAsk.auction.bids.sort((a, b) => {
        return b.createdAt.getTime() - a.createdAt.getTime();
      });
    }
    /**
     * tokenDescription: {
  attributes: [{ key, type, value }]// ?????? ???????? ??????????????????,
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
        //TODO: ???????????????????? ???????????? ????????????
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

    return plainToInstance<OfferContractAskDto, Record<string, any>>(OfferContractAskDto, plain, {
      excludeExtraneousValues: true,
    });
  }
}
