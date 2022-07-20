import { BadRequestException, HttpStatus } from '@nestjs/common';

export class DateHelper {
  static addDays(days = 0, from = new Date()): Date {
    return new Date(from.getTime() + days * 24 * 60 * 60 * 1000);
  }

  static addMinutes(minutes = 0, from = new Date()): Date {
    return new Date(from.getTime() + minutes * 60 * 1000);
  }

  static checkDateAndMinutes(days: number, minutes: number): void {
    if (days === 0 && minutes === 0) {
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Days and minutes cannot be zero at the same time',
      });
    }
  }
  static toEnum(input: Record<string, string>): string {
    return Object.values(input)
      .map((v) => `'${v}'`)
      .join(', ');
  }
}
