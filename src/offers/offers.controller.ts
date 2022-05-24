import { OfferTraits } from './dto/offer-traits';
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
import { OfferAttributesDto } from './dto';
import { ParseOffersAttributes } from './pipes/offers-attributes.pipe';
import { OfferAttributes } from './dto/offer-attributes';

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

      if (offer) {
        return offer;
      } else {
        throw new NotFoundException(
          `No active offer for collection ${collectionId}, token ${tokenId}`,
        );
      }

    }

    @Get('attributes/:collectionId')
    @ApiOperation({
      summary: 'Get attributes by collectionId'
  })
    @ApiResponse({ type: OfferTraits, status: HttpStatus.OK })
    async getTraitsByCollection(@Param('collectionId', ParseIntPipe) collectionId: number ): Promise<OfferTraits> {

      const traits = await this.offersService.getAttributes(collectionId);

      if (traits) return traits;

      throw new NotFoundException(
        `No found  collection ${collectionId} in offer`,
      );
    }

    @Get('attribute-counts')
    @ApiOperation({
      summary: 'Get count of attributes by collectionId'
    })
    @ApiResponse({ status: HttpStatus.OK, type: OfferAttributes })
    async getAttributeCounts(
      @Query(ParseOffersAttributes) offerAttributes: OfferAttributesDto,
    ): Promise<Array<OfferAttributes>> {
      return this.offersService.getAttributesCounts(offerAttributes);
    }
}
