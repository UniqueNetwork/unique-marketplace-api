import { TypeAttributToken } from '../../types/search';
import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type, plainToInstance } from 'class-transformer';
import { MarketTrade } from '../../entity';
import { TokenDescriptionDto } from '../../offers/dto';
import { IsUUID } from 'class-validator';

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

  @ApiProperty({ description: 'Status' })
  @Expose()
  @Type(() => String)
  status: string;

  @ApiProperty({ description: 'Offer Id' })
  @Expose()
  @Type(() => String)
  offerId: string;

  @ApiProperty({ description: 'Token description' })
  @Expose()
  @Type(() => TokenDescriptionDto)
  tokenDescription: TokenDescriptionDto;

  static fromTrade(trade: MarketTrade): MarketTradeDto {
    const plain: Record<string, any> = {
      buyer: trade.address_buyer,
      seller: trade.address_seller,
      collectionId: +trade.collection_id,
      creationDate: trade.ask_created_at,
      price: trade.originPrice,
      quoteId: +trade.currency,
      tokenId: +trade.token_id,
      tradeDate: trade.buy_created_at,
      status: trade.status,
      offerId: trade?.offers?.id || null,
    };

    if (Array.isArray(trade?.search_index)) {
      plain.tokenDescription = trade?.search_index.reduce(
        (acc, item) => {
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
            if (image.search('ipfs.uniquenetwork.dev') !== -1) {
              acc[`${item.key}`] = image;
            } else {
              if (image.search('https://') !== -1 && image.search('http://') !== 0) {
                acc[`${item.key}`] = image;
              } else {
                if (image) {
                  acc[`${item.key}`] = `https://ipfs.uniquenetwork.dev/ipfs/${image}`;
                } else {
                  acc[`${item.key}`] = null;
                }
              }
            }
          }

          if (
            (item.type === TypeAttributToken.String || item.type === TypeAttributToken.Enum) &&
            !['collectionName', 'description'].includes(item.key)
          ) {
            acc.attributes.push({
              key: item.key,
              value: item.items.length === 1 ? item.items.pop() : item.items,
              type: item.type,
            });
          }
          return acc;
        },
        {
          attributes: [],
        },
      );
    }

    return plainToInstance<MarketTradeDto, Record<string, any>>(MarketTradeDto, plain, {
      excludeExtraneousValues: true,
    });
  }
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

export class TradeAuctionDto {
  @ApiProperty({})
  @IsUUID('4')
  auctionId: string;
}
