import { ApiProperty } from '@nestjs/swagger';

export class ResponseAdminDto {
  @ApiProperty({})
  accessToken: string;
  @ApiProperty({})
  refreshToken: string;
}
export class ResponseAdminErrorDto {
  @ApiProperty({})
  statusCode: number;
  @ApiProperty({})
  message: string;
  @ApiProperty({})
  error: string;
}

export class ResponseCreateDto {
  @ApiProperty({})
  statusCode: number;
  @ApiProperty({})
  message: string;
  @ApiProperty({})
  data: {};
}
