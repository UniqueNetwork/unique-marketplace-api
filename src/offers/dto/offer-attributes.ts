import { Dto } from './../../utils/dto';
import { ClassToDto } from './../../utils/type-generators/class-to-dto';
import { ApiProperty } from "@nestjs/swagger";
import { Expose } from 'class-transformer';

export class OfferAttributesDto {
  @ApiProperty({ name: 'collectionId',
  items: { type: 'integer', default: '' },
  required: true, type: 'array', isArray: true
})
  public collectionId: number[];

  constructor(value: ClassToDto<OfferAttributesDto>) {
    Dto.init(this, value);
  }
}


export class OfferAttributes {
  @ApiProperty({ description: 'Number Of Attributes' })
  @Expose()
  numberOfAttributes: number;
  @ApiProperty({ description: 'Amount' })
  @Expose()
  amount: number;
}