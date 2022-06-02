import { HttpStatus } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { Collection } from '../../entity/collection';

export class ImportCollectionDTO {
  @ApiProperty({ example: 1 })
  collectionId: number;
}

export class ListCollectionResult {
  @ApiProperty({ default: HttpStatus.OK })
  statusCode = HttpStatus.OK;
  @ApiProperty()
  message: string;
  @ApiProperty()
  data: Collection[];
}

export class ImportCollectionResult {
  @ApiProperty({ default: HttpStatus.OK })
  statusCode = HttpStatus.OK;
  @ApiProperty()
  message: string;
  @ApiProperty()
  data: Collection;
}

export class ImportCollectionError {
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

export class DisableCollectionError {
  @ApiProperty({ default: HttpStatus.NOT_FOUND })
  statusCode = HttpStatus.NOT_FOUND;
  @ApiProperty()
  message: string;
  @ApiProperty()
  error: string;
}
