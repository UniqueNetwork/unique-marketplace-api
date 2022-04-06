import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose, Type } from 'class-transformer';

export interface Trait {
  trait: string;
  count: number;
}

class TraitDto implements Trait {
  @Exclude() trait: string;
  @Exclude() count: number;
  @Exclude() key: string;
}

export class OfferTraits {
  @ApiProperty({ description: 'Collection ID' })
  @Expose()
  collectionId: number;

  @Expose()
  @Type(() => TraitDto)
  traits: TraitDto[]
}