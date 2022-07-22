import { Controller, Get, HttpStatus, Param, Query, UseInterceptors } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import * as fs from 'fs';

import { MarketTradeDto, ResponseMarketTradeDto, TradesFilter } from './dto';
import { ParseTradesFilterPipe } from './pipes';
import { TradesService } from './trades.service';
import { queryArray } from '../utils/decorators/query-array.decorator';
import { PaginationRequest } from '../utils/pagination/pagination-request';
import { PaginationResult } from '../utils/pagination/pagination-result';
import { TradeSortingRequest } from '../utils/sorting/sorting-request';
import { TraceInterceptor } from '../utils/sentry';

@ApiTags('Trades')
@Controller('trades')
@UseInterceptors(TraceInterceptor)
export class TradesController {
  constructor(private readonly tradesService: TradesService) {}

  @Get('/')
  @ApiQuery(queryArray('collectionId', 'integer'))
  @ApiOperation({
    summary: 'Get trades with sort and filters',
    description: fs.readFileSync('docs/trades.md').toString(),
  })
  @ApiResponse({ type: ResponseMarketTradeDto, status: HttpStatus.OK })
  get(
    @Query() pagination: PaginationRequest,
    @Query() sort: TradeSortingRequest,
    @Query(ParseTradesFilterPipe) tradesFilter: TradesFilter,
  ): Promise<PaginationResult<MarketTradeDto>> {
    return this.tradesService.get(tradesFilter, undefined, pagination, sort);
  }

  @Get('/auction/:auctionId')
  @ApiOperation({
    summary: 'Get auction by id',
  })
  @ApiResponse({ type: ResponseMarketTradeDto, status: HttpStatus.OK })
  getByAuction(@Param('auctionId') auctionId: string): Promise<any> {
    return this.tradesService.getByAuction(auctionId);
  }

  @Get('/:accountId')
  @ApiQuery(queryArray('collectionId', 'integer'))
  @ApiOperation({
    summary: 'Get trades with sort, filters and seller',
    description: fs.readFileSync('docs/trades.md').toString(),
  })
  @ApiResponse({ type: MarketTradeDto, status: HttpStatus.OK })
  getBySeller(
    @Param('accountId') accountId: string,
    @Query() sort: TradeSortingRequest,
    @Query() pagination: PaginationRequest,
    @Query(ParseTradesFilterPipe) tradesFilter: TradesFilter,
  ): Promise<PaginationResult<MarketTradeDto>> {
    return this.tradesService.get(tradesFilter, accountId, pagination, sort);
  }
}
