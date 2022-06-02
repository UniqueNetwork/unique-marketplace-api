import { ApiProperty } from '@nestjs/swagger';
import { Collection } from '../../entity/collection';

export class ListCollectionResult {
  @ApiProperty({})
  statusCode: number;
  @ApiProperty({})
  message: string;
  @ApiProperty({})
  data: Collection[];
}

export class ImportCollectionResult {
  @ApiProperty({})
  statusCode: number;
  @ApiProperty({})
  message: string;
  @ApiProperty({})
  data: Collection;
}

export class DisableCollectionResult {
  @ApiProperty({})
  statusCode: number;
  @ApiProperty({})
  message: string;
  @ApiProperty({})
  data: Collection;
}
