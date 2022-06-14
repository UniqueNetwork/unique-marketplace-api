import { HttpStatus } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { BnList } from '@polkadot/util/types';
import { Collection } from '../../entity/collection';
import { IsInt, IsOptional, IsPositive, Max, Min } from 'class-validator';
import { U32_MAX_VALUE } from '../constants';
import { Transform, Type } from 'class-transformer';
import { UNIQUE } from '../../utils/blockchain/web3';
import { IsBigInt } from '../../offers/decorators/is-bigint.decorator';
import { BigIntGte } from '../../offers/decorators/bigint-gte.decorator';

const ToBigInt = () =>
  Transform(({ value }: { value: any }): BigInt | any => {
    try {
      return BigInt(value);
    } catch (error) {
      return value;
    }
  });

export class ListCollectionResult {
  @ApiProperty({ default: HttpStatus.OK })
  statusCode = HttpStatus.OK;
  @ApiProperty()
  message: string;
  @ApiProperty()
  data: Collection[];
}

export class CollectionsFilter {
  @ApiProperty({ required: false })
  @IsOptional()
  collectionId: number;
}

export class EnableCollectionDTO {
  @ApiProperty({ example: 1 })
  collectionId: number;
}

export class EnableCollectionResult {
  @ApiProperty({ default: HttpStatus.OK })
  statusCode = HttpStatus.OK;
  @ApiProperty()
  message: string;
  @ApiProperty()
  data: Collection;
}

export class DisableCollectionResult {
  @ApiProperty({ default: HttpStatus.OK })
  statusCode = HttpStatus.OK;
  @ApiProperty()
  message: string;
  @ApiProperty()
  data: Collection;
}

export class MassFixPriceSaleResult {
  @ApiProperty({ default: HttpStatus.OK })
  statusCode = HttpStatus.OK;
  @ApiProperty()
  message: string;
  @ApiProperty()
  data: BnList;
}

export class MassFixPriceSaleDTO {
  @ApiProperty({ example: 5 })
  @Max(U32_MAX_VALUE)
  @IsPositive()
  @IsInt()
  collectionId: number;
  @ApiProperty({ example: UNIQUE.toString() })
  @ToBigInt()
  price: bigint;
}

export class MassAuctionSaleResult {
  @ApiProperty({ default: HttpStatus.OK })
  statusCode = HttpStatus.OK;
  @ApiProperty()
  message: string;
  @ApiProperty()
  data: BnList;
}

export class MassAuctionSaleDTO {
  @ApiProperty({ example: 5 })
  @Max(U32_MAX_VALUE)
  @IsPositive()
  @IsInt()
  collectionId: number;

  @ApiProperty({ example: '100' })
  @ToBigInt()
  @IsBigInt()
  @BigIntGte(1n)
  startPrice: bigint;

  @ApiProperty({ example: '10' })
  @ToBigInt()
  @IsBigInt()
  @BigIntGte(1n)
  priceStep: bigint;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(21)
  days: number;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(59)
  minutes: number;
}
