import { HttpStatus } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';

export class MassCancelResult {
  @ApiProperty({ default: HttpStatus.OK })
  statusCode = HttpStatus.OK;
  @ApiProperty({ example: '{count} offers successfully canceled' })
  message: string;
}
