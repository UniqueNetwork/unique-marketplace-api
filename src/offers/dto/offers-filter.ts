import { ApiProperty } from '@nestjs/swagger';

import { Dto } from '../../utils/dto';
import { ClassToDto } from '../../utils/type-generators/class-to-dto';
import {Transform, Type} from 'class-transformer';
import {IsInt, IsNumber, IsOptional, IsPositive, Min} from 'class-validator';
import {IsBigInt} from "../decorators/biging.decorator";

export class OffersFilter {
    @ApiProperty({ name: 'collectionId', items: { type: 'integer', default: '' }, required: false, type: 'array', isArray: true })
    public collectionId?: number[];

    @ApiProperty({ required: false, type: String })
    @Type(() => BigInt)
    @IsOptional()
    //@Min(0)
    public minPrice?: BigInt;

    @ApiProperty({ required: false, type: String })
    @Type(() => BigInt)
    //@Max(9223372036854775807)
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
