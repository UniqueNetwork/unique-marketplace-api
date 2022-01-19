import { Controller, Get, HttpStatus, Query } from '@nestjs/common';

import { PaginationRequest } from '../utils/pagination/pagination-request';
import { PaginationResult } from '../utils/pagination/pagination-result';
import { OfferSortingRequest } from '../utils/sorting/sorting-request';
import { OfferContractAskDto, OfferDto } from './dto/offer-dto';
import { OffersFilter } from './dto/offers-filter';
import { ParseOffersFilterPipe } from './pipes/offers-filter.pipe';
import { OffersService } from './offers.service';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import * as fs from 'fs';
import { MarketTradeDto } from '../trades/dto/trade-dto';

@Controller('Offers')
export class OffersController {
    constructor(private readonly offersService: OffersService) {}

    @Get()
    @ApiOperation({
        summary: 'Get offers, filters and seller',
        description: fs.readFileSync('docs/offers.md').toString(),
    })
    @ApiResponse({ type: MarketTradeDto, status: HttpStatus.OK })
    get(
        @Query() pagination: PaginationRequest,
        @Query(ParseOffersFilterPipe) offersFilter: OffersFilter,
        @Query() sort: OfferSortingRequest,
    ): Promise<PaginationResult<OfferContractAskDto>> {
        return this.offersService.get(pagination, offersFilter, sort);
    }
}
