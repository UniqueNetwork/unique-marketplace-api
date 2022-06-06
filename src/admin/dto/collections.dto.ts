import { HttpStatus } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { Collection } from '../../entity/collection';
import { IsInt, IsOptional, IsPositive, Max } from 'class-validator';
import { U32_MAX_VALUE } from '../constants';
import { Transform } from 'class-transformer';

export class ListCollectionResult {
  @ApiProperty({ default: HttpStatus.OK })
  statusCode = HttpStatus.OK;
  @ApiProperty()
  message: string;
  @ApiProperty()
  data: Collection[];
}

export class ListCollectionBadRequestError {
  @ApiProperty({ default: HttpStatus.BAD_REQUEST })
  statusCode = HttpStatus.BAD_REQUEST;
  @ApiProperty()
  message: string;
  @ApiProperty()
  error: string;
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

export class EnableCollectionBadRequestError {
  @ApiProperty({ default: HttpStatus.BAD_REQUEST })
  statusCode = HttpStatus.BAD_REQUEST;
  @ApiProperty()
  message: string;
  @ApiProperty()
  error: string;
}

export class DisableCollectionResult {
  @ApiProperty({ default: HttpStatus.OK })
  statusCode = HttpStatus.OK;
  @ApiProperty()
  message: string;
  @ApiProperty()
  data: Collection;
}

export class DisableCollectionNotFoundError {
  @ApiProperty({ default: HttpStatus.NOT_FOUND })
  statusCode = HttpStatus.NOT_FOUND;
  @ApiProperty()
  message: string;
  @ApiProperty()
  error: string;
}

export class DisableCollectionBadRequestError {
  @ApiProperty({ default: HttpStatus.BAD_REQUEST })
  statusCode = HttpStatus.BAD_REQUEST;
  @ApiProperty()
  message: string;
  @ApiProperty()
  error: string;
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
  @ApiProperty()
  @Max(U32_MAX_VALUE)
  @IsPositive()
  @IsInt()
  collectionId: number;
  @ApiProperty()
  @Transform(({ value }) => BigInt(value))
  price: bigint;
}

export class MassFixPriceSaleBadRequestError {
  @ApiProperty({ default: HttpStatus.BAD_REQUEST })
  statusCode = HttpStatus.BAD_REQUEST;
  @ApiProperty()
  message: string;
  @ApiProperty()
  error: string;
}
