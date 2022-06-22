import { HttpStatus } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { Collection } from '../../entity/collection';
import { IsInt, IsOptional, IsPositive, Max, Min } from 'class-validator';
import { BIGINT_MAX_VALUE, U32_MAX_VALUE } from '../constants';
import { Transform, Type } from 'class-transformer';
import { UNIQUE } from '../../utils/blockchain/web3';
import { IsBigInt, BigIntGte, BigIntLte } from '../../offers/decorators';

const ToBigInt = () =>
  Transform(({ value }: { value: any }): bigint | any => {
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
  data: number[];
}

export class MassFixPriceSaleDTO {
  @ApiProperty({ example: 5 })
  @Max(U32_MAX_VALUE)
  @IsPositive()
  @IsInt()
  collectionId: number;
  @ApiProperty({ example: UNIQUE.toString(), description: `Max value is ${BIGINT_MAX_VALUE}` })
  @BigIntLte(BIGINT_MAX_VALUE)
  @IsBigInt()
  @ToBigInt()
  price: bigint;
}

export class MassAuctionSaleResult {
  @ApiProperty({ default: HttpStatus.OK })
  statusCode = HttpStatus.OK;
  @ApiProperty()
  message: string;
  @ApiProperty()
  data: number[];
}

export class MassAuctionSaleDTO {
  @ApiProperty({ example: 5 })
  @Max(U32_MAX_VALUE)
  @IsPositive()
  @IsInt()
  collectionId: number;

  @ApiProperty({ example: '100' })
  @BigIntLte(BIGINT_MAX_VALUE)
  @BigIntGte(1n)
  @IsBigInt()
  @ToBigInt()
  startPrice: bigint;

  @ApiProperty({ example: '10' })
  @BigIntLte(BIGINT_MAX_VALUE)
  @BigIntGte(1n)
  @IsBigInt()
  @ToBigInt()
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
