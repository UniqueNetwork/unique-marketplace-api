import { ApiProperty } from '@nestjs/swagger';

export class AddTokensDto {
  @ApiProperty({ example: '1,3,5,8,17-40' })
  tokens: string;
}
