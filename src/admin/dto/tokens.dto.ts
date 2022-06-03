import { ApiProperty } from '@nestjs/swagger';

export class AddTokensDto {
  @ApiProperty({ example: '1,3,5,8,17-40' })
  tokens: string;
}

export class ResponseTokenDto {
  @ApiProperty({ default: 200 })
  statusCode: number;
  @ApiProperty({})
  message: string;
}
