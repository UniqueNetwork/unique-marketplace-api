import { HttpStatus } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { Collection } from '../../entity/collection';
import { IsOptional } from 'class-validator';

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
  @ApiProperty({ default: HttpStatus.NOT_FOUND })
  statusCode = HttpStatus.NOT_FOUND;
  @ApiProperty()
  message: string;
  @ApiProperty()
  error: string;
}
