import { Connection, SelectQueryBuilder } from 'typeorm';
import { ColumnMetadata } from 'typeorm/metadata/ColumnMetadata';
import { BlockchainBlock, OffersEntity } from '../entity';
import { OfferSortingRequest } from '../utils/sorting/sorting-request';
import { OfferEntityDto } from './dto/offer-dto';
import { SortingOrder } from '../utils/sorting/sorting-order';
import { SortingParameter } from '../utils/sorting/sorting-parameter';

type SortMapping<T> = Partial<Record<keyof OfferEntityDto, keyof T>>;

const prepareMapping = (input: Record<string, string>, columnMetadata: ColumnMetadata[]): Record<string, string> => {
  return Object.entries(input).reduce((acc, [key, value]) => {
    const meta = columnMetadata.find((m) => m.propertyName === value);

    return meta
      ? {
          ...acc,
          [key.toLowerCase()]: meta.databaseNameWithoutPrefixes,
        }
      : acc;
  }, {});
};

const offersMapping: SortMapping<OffersEntity> = {
  price: 'price',
  tokenId: 'token_id',
  collectionId: 'collection_id',
};

const blockMapping: SortMapping<BlockchainBlock> = {
  creationDate: 'created_at',
};

const blockAlias = 'block';

export class OffersQuerySortHelper {
  readonly offersSorts: Record<string, string>;
  readonly blockSorts: Record<string, string>;

  constructor(connection: Connection) {
    this.offersSorts = prepareMapping(offersMapping, connection.getMetadata(OffersEntity).columns);
    this.blockSorts = prepareMapping(blockMapping, connection.getMetadata(BlockchainBlock).columns);
  }

  private getSort(query: SelectQueryBuilder<OffersEntity>, sortingParameter: SortingParameter): string | undefined {
    const contractColumn = this.offersSorts[sortingParameter.column.toLowerCase()];

    if (contractColumn) return `${query.alias}.${contractColumn}`;

    const blockColumn = this.blockSorts[sortingParameter.column.toLowerCase()];

    return blockColumn ? `${blockAlias}.${blockColumn}` : undefined;
  }

  private getFlatSort(sortingParameter: SortingParameter): string | undefined {
    switch (sortingParameter.column.toLowerCase()) {
      case 'price':
        return 'offer_price';
      case 'tokenid':
        return 'token_id';
      case 'creationdate':
        return 'offer_created_at_ask';
    }
    return 'offer_block_number_ask';
  }

  private static getOrder(sortingParameter: SortingParameter): 'DESC' | 'ASC' {
    return sortingParameter.order === SortingOrder.Desc ? 'DESC' : 'ASC';
  }

  applySort(query: SelectQueryBuilder<OffersEntity>, { sort = [] }: OfferSortingRequest) {
    for (const sortingParameter of sort) {
      const sort = this.getSort(query, sortingParameter);
      if (sort) {
        const order = OffersQuerySortHelper.getOrder(sortingParameter);

        query.addOrderBy(sort, order);
      }
    }

    query.addOrderBy(`${query.alias}.block_number_ask`, 'DESC');

    return query;
  }

  applyFlatSort(query: SelectQueryBuilder<any>, { sort = [] }: OfferSortingRequest) {
    if (sort.length == 0) {
      query.addOrderBy('offer_block_number_ask', 'DESC');
    }
    for (const sortingParameter of sort) {
      const sort = this.getFlatSort(sortingParameter);
      if (sort) {
        const order = OffersQuerySortHelper.getOrder(sortingParameter);
        query.addOrderBy(sort, order);
      }
    }
    return query;
  }
}
