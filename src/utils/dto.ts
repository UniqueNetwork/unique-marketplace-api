import { ClassToDto } from './type-generators/class-to-dto';

export class Dto {
  static init<T>(value: T, dto: ClassToDto<T>) {
    Object.assign(value, dto);
  }
}
