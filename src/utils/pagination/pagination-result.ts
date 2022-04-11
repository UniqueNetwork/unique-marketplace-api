import { Exclude, Type } from "class-transformer";

export interface PaginationResult<T> {
  items: T[]
  itemsCount: number;
  page: number;
  pageSize: number;
}

export class PaginationResultDto<T> implements PaginationResult<T> {
  // eslint-disable-next-line @typescript-eslint/ban-types
  constructor(type: Function, paginationResult: PaginationResult<T>) {
    this.type = type;
    Object.assign(this, paginationResult);
  }

  @Exclude()
  // eslint-disable-next-line @typescript-eslint/ban-types
  type: Function;

  @Type(options => {
    return (options.newObject as PaginationResultDto<T>).type;
  })
  items: T[];
  itemsCount: number;
  page: number;
  pageSize: number;
}