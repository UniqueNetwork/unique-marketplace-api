import { ApiProperty } from '@nestjs/swagger';

import { ClassToDto } from '../../utils/type-generators/class-to-dto';
import { Dto } from '../../utils/dto';
import { SellingMethod } from '../../types';

export class TradesFilter {
  @ApiProperty({
    name: 'collectionId',
    items: { type: 'integer', default: '' },
    required: false,
    type: 'array',
    isArray: true,
  })
  public collectionId?: number[];

  @ApiProperty({
    name: 'tokenId',
    items: { type: 'integer', default: '' },
    required: false,
    type: 'array',
    isArray: true,
  })
  public tokenId?: number[];

  @ApiProperty({ required: false })
  public searchText?: string;

  @ApiProperty({
    name: 'traits',
    items: { type: 'string', default: '' },
    required: false,
    type: 'array',
    isArray: true,
  })
  public traits?: string[];

  @ApiProperty({
    type: 'enum',
    enum: SellingMethod,
    name: 'status',
    required: false,
  })
  public status?: SellingMethod;

  constructor(value: ClassToDto<TradesFilter>) {
    Dto.init(this, value);
  }
}
