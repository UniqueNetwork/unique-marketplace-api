import { ApiProperty } from '@nestjs/swagger';
import { HttpStatus } from '@nestjs/common';

export class BadRequestResponse {
  @ApiProperty({ default: HttpStatus.BAD_REQUEST })
  statusCode = HttpStatus.BAD_REQUEST;

  @ApiProperty()
  message: string;

  @ApiProperty()
  error: string;
}
export class NotFoundResponse {
  @ApiProperty({ default: HttpStatus.NOT_FOUND })
  statusCode = HttpStatus.NOT_FOUND;

  @ApiProperty()
  message: string;

  @ApiProperty()
  error: string;
}
