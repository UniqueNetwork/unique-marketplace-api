import { HttpStatus } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';

export class BadRequestResponse {
  @ApiProperty({ default: HttpStatus.BAD_REQUEST })
  statusCode = HttpStatus.BAD_REQUEST;
  @ApiProperty()
  message: string;
  @ApiProperty()
  error: string;
}

export class ConflictResponse {
  @ApiProperty({ default: HttpStatus.CONFLICT })
  statusCode = HttpStatus.CONFLICT;
  @ApiProperty()
  message: string;
  @ApiProperty()
  error: string;
}

export class UnauthorizedResponse {
  @ApiProperty({ default: HttpStatus.UNAUTHORIZED })
  statusCode = HttpStatus.UNAUTHORIZED;
  @ApiProperty()
  message: string;
  @ApiProperty()
  error: string;
}
