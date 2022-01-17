import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiQuery } from '@nestjs/swagger';

import { queryArray } from '../utils/decorators/query-array.decorator';
import { PaginationRequest } from '../utils/pagination/pagination-request';
import { PaginationResult } from '../utils/pagination/pagination-result';
import { TradeSortingRequest } from '../utils/sorting/sorting-request';
import { parseCollectionIdRequest } from '../utils/parsers/parse-collection-id-request';
import { QueryParamArray } from '../utils/query-param-array';
import { MarketTradeDto, TradeDto } from './trade-dto';
import { TradesService } from './trades.service';


@Controller('Trades')
export class TradesController {
  constructor(private readonly tradesService: TradesService) {}

  @ApiQuery(queryArray('collectionId', 'integer'))
  @Get()
  get(@Query() pagination: PaginationRequest,
      @Query() sort: TradeSortingRequest,
      @Query('collectionId') collectionId?: QueryParamArray): Promise<PaginationResult<MarketTradeDto>> {
    return this.tradesService.get(parseCollectionIdRequest(collectionId), undefined, pagination, sort);
  }

  @ApiQuery(queryArray('collectionId', 'integer'))
  @Get(':seller')
  getBySeller(
    @Param('seller') seller: string,
    @Query() sort: TradeSortingRequest,
    @Query() pagination: PaginationRequest,
    @Query('collectionId') collectionId?: QueryParamArray): Promise<PaginationResult<MarketTradeDto>> {
    return this.tradesService.get(parseCollectionIdRequest(collectionId), seller, pagination, sort);
  }
}
