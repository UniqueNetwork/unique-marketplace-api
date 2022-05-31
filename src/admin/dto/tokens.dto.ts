import { ApiProperty } from '@nestjs/swagger';
import { example } from 'yargs';

export class AddTokensDto {
  @ApiProperty({ example: '1,3,17-40,5,24-33' })
  tokens: string;
}
