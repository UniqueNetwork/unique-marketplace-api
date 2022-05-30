import { ApiProperty } from '@nestjs/swagger';
import { IsDefined, IsNumber } from 'class-validator';

export class AddCollectionDTO {
  @ApiProperty({})
  @IsDefined()
  @IsNumber()
  collectionId: number;
}

export class RemoveCollectionDTO {
  @ApiProperty({})
  @IsDefined()
  @IsNumber()
  collectionId: number;
}
