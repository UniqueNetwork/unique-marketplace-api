import { SortingOrder } from './sorting-order';

export interface SortingParameter {
  column: string;

  order: SortingOrder;
}
