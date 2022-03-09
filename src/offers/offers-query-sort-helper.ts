import { Connection, SelectQueryBuilder } from 'typeorm';
import { ColumnMetadata } from 'typeorm/metadata/ColumnMetadata';
import { BlockchainBlock, ContractAsk } from '../entity';
import { OfferSortingRequest } from '../utils/sorting/sorting-request';
import { OfferContractAskDto } from './dto/offer-dto';
import { SortingOrder } from '../utils/sorting/sorting-order';
import { SortingParameter } from '../utils/sorting/sorting-parameter';

type SortMapping<T> = Partial<Record<keyof OfferContractAskDto, keyof T>>;

const prepareMapping = (input: Record<string, string>, columnMetadata: ColumnMetadata[]): Record<string, string> => {
  return Object.entries(input).reduce(
    (acc, [key, value]) => {
      const meta = columnMetadata.find((m) => m.propertyName === value);

      return meta ? {
        ...acc,
        [key.toLowerCase()]: meta.databaseNameWithoutPrefixes,
      } : acc;
    },
    {},
  );
};

const contractAskMapping: SortMapping<ContractAsk> = {
  price: 'price',
  tokenId: 'token_id',
  collectionId: 'collection_id',
};

const blockMapping: SortMapping<BlockchainBlock> = {
  creationDate: 'created_at',
};

const blockAlias = 'blocks';

export class OffersQuerySortHelper {
  readonly contractAskSorts: Record<string, string>;
  readonly blockSorts: Record<string, string>;

  constructor(connection: Connection) {
    this.contractAskSorts = prepareMapping(contractAskMapping, connection.getMetadata(ContractAsk).columns);
    this.blockSorts = prepareMapping(blockMapping, connection.getMetadata(BlockchainBlock).columns);
  }

  private getSort(query: SelectQueryBuilder<ContractAsk>, sortingParameter: SortingParameter): string | undefined {
    const contractColumn = this.contractAskSorts[sortingParameter.column.toLowerCase()];

    if (contractColumn) return `${query.alias}.${contractColumn}`;

    const blockColumn = this.blockSorts[sortingParameter.column.toLowerCase()];

    return blockColumn ? `${blockAlias}.${blockColumn}` : undefined;
  }

  private static getOrder(sortingParameter: SortingParameter): 'DESC' | 'ASC' {
    return sortingParameter.order === SortingOrder.Desc ? 'DESC' : 'ASC';
  }

  applySort(query: SelectQueryBuilder<ContractAsk>, { sort = [] }: OfferSortingRequest) {
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
}
