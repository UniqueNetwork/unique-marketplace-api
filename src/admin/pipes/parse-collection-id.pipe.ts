import { PipeTransform, Injectable, ArgumentMetadata, BadRequestException } from '@nestjs/common';
import { isNumber, isInt, isPositive } from 'class-validator';

@Injectable()
export class ParseCollectionIdPipe implements PipeTransform<string, number> {
  transform(param: string, _metadata: ArgumentMetadata): number {
    const value = Number(param);

    if (!isNumber(value) || !isInt(value) || !isPositive(value) || value > 4294967295) throw new BadRequestException('Please enter valid ID');

    return value;
  }
}
