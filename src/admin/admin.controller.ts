import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Query, UseGuards, ValidationPipe } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import * as fs from 'fs';

import { CollectionsService, TokenService, MassSaleService, AdminService, MassCancelingService } from './services';
import { AuthGuard, MainSaleSeedGuard, LoginGuard } from './guards';
import {
  AddTokensDto,
  CollectionsFilter,
  DisableCollectionResult,
  EnableCollectionDTO,
  EnableCollectionResult,
  ListCollectionResult,
  MassAuctionSaleResult,
  MassFixPriceSaleDTO,
  MassFixPriceSaleResult,
  ResponseAdminDto,
  ResponseAdminForbiddenDto,
  ResponseAdminUnauthorizedDto,
  ResponseTokenDto,
  MassAuctionSaleDTO,
  BadRequestResponse,
  NotFoundResponse,
  MassCancelResult,
} from './dto';
import { CollectionsFilterPipe, ParseCollectionIdPipe } from './pipes';

@ApiTags('Administration')
@ApiBearerAuth()
@ApiUnauthorizedResponse({
  description: 'Unauthorized address or bad signature',
  type: ResponseAdminUnauthorizedDto,
})
@ApiForbiddenResponse({
  description: 'Forbidden. Marketplace disabled management for administrators.',
  type: ResponseAdminForbiddenDto,
})
@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly collectionsService: CollectionsService,
    private readonly tokenService: TokenService,
    private readonly massSaleService: MassSaleService,
    private readonly massCancelingService: MassCancelingService,
  ) {}

  @Post('/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'User authorization',
    description: fs.readFileSync('docs/admin_login.md').toString(),
  })
  @UseGuards(LoginGuard)
  @ApiQuery({
    name: 'account',
    description: 'Substrate account',
    example: '5EsQUxc6FLEJKgCwWbiC4kBuCbBt6ePtdKLvVP5gfpXkrztf',
  })
  @ApiResponse({ status: HttpStatus.OK, type: ResponseAdminDto })
  async login(@Query('account') signerAddress: string): Promise<ResponseAdminDto> {
    return await this.adminService.login(signerAddress);
  }

  @Get('/collections')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List collections',
    description: fs.readFileSync('docs/admin_collection_list.md').toString(),
  })
  @ApiOperation({ description: 'List collection' })
  @ApiResponse({ status: HttpStatus.OK, type: ListCollectionResult })
  @ApiBadRequestResponse({ type: BadRequestResponse })
  @UseGuards(AuthGuard)
  async listCollection(@Query(CollectionsFilterPipe) filter: CollectionsFilter): Promise<ListCollectionResult> {
    return await this.collectionsService.findAll(filter);
  }

  @Post('/collections')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Import collection',
    description: fs.readFileSync('docs/admin_collection_import.md').toString(),
  })
  @ApiResponse({ status: HttpStatus.OK, type: EnableCollectionResult })
  @ApiBody({ type: EnableCollectionDTO })
  @ApiBadRequestResponse({ type: BadRequestResponse })
  @UseGuards(AuthGuard)
  async enableCollection(@Body('collectionId', ParseCollectionIdPipe) collectionId: number): Promise<EnableCollectionResult> {
    return await this.collectionsService.enableById(collectionId);
  }

  @Delete('/collections/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Disable collection',
    description: fs.readFileSync('docs/admin_collection_disable.md').toString(),
  })
  @ApiOperation({ description: 'Disable collection' })
  @ApiResponse({ status: HttpStatus.OK, type: DisableCollectionResult })
  @ApiNotFoundResponse({ type: NotFoundResponse })
  @ApiBadRequestResponse({ type: BadRequestResponse })
  @UseGuards(AuthGuard)
  async disableCollection(@Param('id', ParseCollectionIdPipe) collectionId: number): Promise<DisableCollectionResult> {
    return await this.collectionsService.disableById(collectionId);
  }

  @Post('/tokens/:collectionId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Adding tokens to allowed',
    description: fs.readFileSync('docs/admin_tokens_allowed.md').toString(),
  })
  @UseGuards(AuthGuard)
  @ApiResponse({ status: HttpStatus.OK, type: ResponseTokenDto })
  async addTokens(@Param('collectionId') collectionId: string, @Body() data: AddTokensDto): Promise<ResponseTokenDto> {
    return await this.tokenService.addTokens(collectionId, data);
  }

  @Post('/collections/fixprice')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Mass fix price sale',
    description: fs.readFileSync('docs/mass_fixprice_sale.md').toString(),
  })
  @ApiResponse({ status: HttpStatus.OK, type: MassFixPriceSaleResult })
  @ApiBadRequestResponse({ type: BadRequestResponse })
  @UseGuards(AuthGuard, MainSaleSeedGuard)
  async massFixPriceSale(@Body(new ValidationPipe({ transform: true })) data: MassFixPriceSaleDTO): Promise<MassFixPriceSaleResult> {
    return await this.massSaleService.massFixPriceSale(data);
  }

  @Post('/collections/auction')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Mass auction sale',
    description: fs.readFileSync('docs/mass_auction_sale.md').toString(),
  })
  @ApiResponse({ status: HttpStatus.OK, type: MassAuctionSaleResult })
  @ApiBadRequestResponse({ type: BadRequestResponse })
  @UseGuards(AuthGuard, MainSaleSeedGuard)
  async massAuctionSale(@Body(new ValidationPipe({ transform: true })) data: MassAuctionSaleDTO): Promise<MassAuctionSaleResult> {
    return await this.massSaleService.massAuctionSale(data);
  }

  @Delete('/mass-cancel')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Mass cancel',
    description: fs.readFileSync('docs/mass_cancel.md').toString(),
  })
  @ApiResponse({ status: HttpStatus.OK, type: MassCancelResult })
  @ApiBadRequestResponse({ type: BadRequestResponse })
  @UseGuards(AuthGuard, MainSaleSeedGuard)
  async massCancel(): Promise<MassCancelResult> {
    return await this.massCancelingService.massCancel();
  }
}
