import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import { isNumber, isInt, isPositive } from 'class-validator';
import { U32_MAX_VALUE } from '../constants';

@Injectable()
export class ParseCollectionIdPipe implements PipeTransform<string, number> {
  transform(param: string): number {
    const value = Number(param);

    if (!isNumber(value) || !isInt(value) || !isPositive(value) || value > U32_MAX_VALUE)
      throw new BadRequestException('Please enter valid ID');

    return value;
  }
}
