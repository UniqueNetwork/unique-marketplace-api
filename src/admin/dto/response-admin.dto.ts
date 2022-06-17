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

export class ResponseAdminUnauthorizedDto {
  @ApiProperty({ default: 401 })
  statusCode: number;
  @ApiProperty({ default: 'Unauthorized address or bad signature.' })
  message: string;
  @ApiProperty({ default: 'Unauthorized' })
  error: string;
}
export class ResponseAdminForbiddenDto {
  @ApiProperty({ default: 403 })
  statusCode: number;
  @ApiProperty({ default: 'Forbidden. Marketplace disabled management for administrators.' })
  message: string;
  @ApiProperty({ default: 'Forbidden' })
  error: string;
}

export class ResponseCreateDto {
  @ApiProperty({})
  statusCode: number;
  @ApiProperty({})
  message: string;
  @ApiProperty({})
  data: Object;
}
