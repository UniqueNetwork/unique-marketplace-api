import {
  Controller,
  Get,
  HttpStatus,
  NotFoundException,
  Param,
  Query,
  UseInterceptors,
  ParseIntPipe,
} from '@nestjs/common';

import { PaginationRequest } from '../utils/pagination/pagination-request';
import { PaginationResultDto } from '../utils/pagination/pagination-result';
import { OfferSortingRequest } from '../utils/sorting/sorting-request';
import { OfferContractAskDto } from './dto/offer-dto';
import { OffersFilter } from './dto/offers-filter';
import { ParseOffersFilterPipe } from './pipes/offers-filter.pipe';
import { OffersService } from './offers.service';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import * as fs from 'fs';
import { TraceInterceptor } from '../utils/sentry';

@ApiTags('Offers')
@Controller()
@UseInterceptors(TraceInterceptor)
export class OffersController {
    constructor(private readonly offersService: OffersService) {}

    @Get('offers')
    @ApiOperation({
        summary: 'Get offers, filters and seller',
        description: fs.readFileSync('docs/offers.md').toString(),
    })
    @ApiResponse({ type: OfferContractAskDto, status: HttpStatus.OK })
    get(
        @Query() pagination: PaginationRequest,
        @Query(ParseOffersFilterPipe) offersFilter: OffersFilter,
        @Query() sort: OfferSortingRequest,
    ): Promise<PaginationResultDto<OfferContractAskDto>> {
        return this.offersService.get(pagination, offersFilter, sort);
    }

    @Get('offer/:collectionId/:tokenId')
    @ApiResponse({ type: OfferContractAskDto, status: HttpStatus.OK })
    async getOneOffer(
      @Param('collectionId', ParseIntPipe) collectionId: number,
      @Param('tokenId', ParseIntPipe) tokenId: number,
    ): Promise<OfferContractAskDto> {
      const offer = await this.offersService.getOne({ collectionId, tokenId })

      if (offer) return offer;

      throw new NotFoundException(
        `No active offer for collection ${collectionId}, token ${tokenId}`,
      );
    }
}
