import { ApiProperty } from '@nestjs/swagger';

import { Dto } from '../../utils/dto';
import { ClassToDto } from '../../utils/type-generators/class-to-dto';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, Max, Min } from 'class-validator';

export class OffersFilter {
    @ApiProperty({ name: 'collectionId', items: { type: 'integer', default: '' }, required: false, type: 'array', isArray: true })
    public collectionId?: number[];

    @ApiProperty({ required: false, type: String })
    @Type(() => Number)
    @IsNumber()
    @IsOptional()
    public minPrice?: BigInt;

    @ApiProperty({ required: false, type: String })
    @Type(() => Number)
    @IsNumber()
    @Max(9223372036854775807)
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

    constructor(value: ClassToDto<OffersFilter>) {
        Dto.init(this, value);
    }
}
