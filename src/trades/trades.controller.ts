import { Controller, Get, HttpStatus, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

import { queryArray } from '../utils/decorators/query-array.decorator';
import { PaginationRequest } from '../utils/pagination/pagination-request';
import { PaginationResult } from '../utils/pagination/pagination-result';
import { TradeSortingRequest } from '../utils/sorting/sorting-request';
import { QueryParamArray } from '../utils/query-param-array';
import { MarketTradeDto, ResponseMarketTradeDto } from './dto/trade-dto';
import { TradesService } from './trades.service';
import * as fs from 'fs';
import { parseCollectionIdRequest } from '../utils/parsers';

@ApiTags('Trades')
@Controller('trades')
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
        @Query('collectionId') collectionId?: QueryParamArray,
    ): Promise<PaginationResult<MarketTradeDto>> {
        return this.tradesService.get(parseCollectionIdRequest(collectionId), undefined, pagination, sort);
    }

    @Get('/:seller')
    @ApiQuery(queryArray('collectionId', 'integer'))
    @ApiOperation({
        summary: 'Get trades with sort, filters and seller',
        description: fs.readFileSync('docs/trades.md').toString(),
    })
    @ApiResponse({ type: MarketTradeDto, status: HttpStatus.OK })
    getBySeller(
        @Param('seller') seller: string,
        @Query() sort: TradeSortingRequest,
        @Query() pagination: PaginationRequest,
        @Query('collectionId') collectionId?: QueryParamArray,
    ): Promise<PaginationResult<MarketTradeDto>> {
        return this.tradesService.get(parseCollectionIdRequest(collectionId), seller, pagination, sort);
    }
}
