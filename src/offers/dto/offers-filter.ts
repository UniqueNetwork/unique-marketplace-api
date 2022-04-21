import { ApiProperty } from '@nestjs/swagger';

import { Dto } from '../../utils/dto';
import { ClassToDto } from '../../utils/type-generators/class-to-dto';
import { Type } from 'class-transformer';
import { IsOptional } from 'class-validator';

export class OffersFilter {
    @ApiProperty({ name: 'collectionId',
    items: { type: 'integer', default: '' },
    required: false, type: 'array', isArray: true
  })
    public collectionId?: number[];

    @ApiProperty({ required: false, type: String })
    @Type(() => BigInt)
    @IsOptional()
    //@Min(0)
    public minPrice?: BigInt;

    @ApiProperty({ required: false, type: String })
    @Type(() => BigInt)
   // @Max(9223372036854775807)
    @IsOptional()
    public maxPrice?: BigInt;

    @ApiProperty({ required: false })
    public seller?: string;

    @ApiProperty({ name: 'traitsCount', items: { type: 'integer', default: '' }, required: false, type: 'array', isArray: true })
    public traitsCount?: number[];

    @ApiProperty({ required: false })
    public searchText?: string;

    @ApiProperty({ required: false })
    public searchLocale?: string;

    @ApiProperty({
      name: 'traits',
      items: { type: 'string', default: '' },
      required: false,
      type: 'array',
      isArray: true })
    public traits?: string[];

    @ApiProperty({
      required: false,
      type: Boolean
    })
    @Type(() => Boolean )
    public isAuction?: boolean | string;

    @ApiProperty({
      required: false,
      type: String
    })
    public bidderAddress?: string

    constructor(value: ClassToDto<OffersFilter>) {
        Dto.init(this, value);
    }
}
