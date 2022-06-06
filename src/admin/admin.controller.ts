import { Body, Controller, Delete, Get, Headers, HttpCode, HttpStatus, Param, Post, Query, Req, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { AdminService } from './admin.service';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiForbiddenResponse,
  ApiHeader,
  ApiNotFoundResponse,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthGuard, MainSaleSeedGuard } from './guards';
import { Request } from 'express';
import {
  AddTokensDto,
  DisableCollectionResult,
  EnableCollectionDTO,
  EnableCollectionResult,
  ListCollectionResult,
  ResponseAdminDto,
  ResponseAdminForbiddenDto,
  ResponseAdminUnauthorizedDto,
  CollectionsFilter,
  ListCollectionBadRequestError,
  EnableCollectionBadRequestError,
  DisableCollectionNotFoundError,
  DisableCollectionBadRequestError,
  ResponseTokenDto,
  MassFixPriceSaleResult,
  MassFixPriceSaleDTO,
  MassFixPriceSaleBadRequestError,
} from './dto';
import { ParseCollectionIdPipe, CollectionsFilterPipe } from './pipes';
import { CollectionsService, TokenService } from './servises';
import * as fs from 'fs';

@ApiTags('Administration')
@ApiUnauthorizedResponse({ description: 'Unauthorized address or bad signature', type: ResponseAdminUnauthorizedDto })
@ApiForbiddenResponse({ description: 'Forbidden. Marketplace disabled management for administrators.', type: ResponseAdminForbiddenDto })
@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly collectionsService: CollectionsService,
    private readonly tokenService: TokenService,
  ) {}

  @Post('/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'User authorization',
    description: fs.readFileSync('docs/admin_login.md').toString(),
  })
  @ApiHeader({ name: 'Signature', description: 'signature' })
  @ApiQuery({ name: 'account', description: 'Substrate account', example: '5EsQUxc6FLEJKgCwWbiC4kBuCbBt6ePtdKLvVP5gfpXkrztf' })
  @ApiResponse({ status: HttpStatus.OK, type: ResponseAdminDto })
  async login(@Headers('Signature') signature = '', @Query('account') signerAddress: string, @Req() req: Request): Promise<ResponseAdminDto> {
    const queryString = req.originalUrl.split('?')[0];
    return await this.adminService.login(signerAddress, signature, queryString);
  }

  @Get('/collections')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List collections',
    description: fs.readFileSync('docs/admin_collection_list.md').toString(),
  })
  @ApiBearerAuth()
  @ApiOperation({ description: 'List collection' })
  @ApiResponse({ status: HttpStatus.OK, type: ListCollectionResult })
  @ApiBadRequestResponse({ type: ListCollectionBadRequestError })
  @UseGuards(AuthGuard)
  async listCollection(@Query(CollectionsFilterPipe) filter: CollectionsFilter): Promise<ListCollectionResult> {
    return await this.collectionsService.findAll(filter);
  }

  @Post('/collections')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Import collection',
    description: fs.readFileSync('docs/admin_collection_import.md').toString(),
  })
  @ApiResponse({ status: HttpStatus.OK, type: EnableCollectionResult })
  @ApiBody({ type: EnableCollectionDTO })
  @ApiBadRequestResponse({ type: EnableCollectionBadRequestError })
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
  @ApiNotFoundResponse({ type: DisableCollectionNotFoundError })
  @ApiBadRequestResponse({ type: DisableCollectionBadRequestError })
  @ApiBearerAuth()
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
  @ApiBearerAuth()
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
  @ApiBearerAuth()
  @ApiResponse({ status: HttpStatus.OK, type: MassFixPriceSaleResult })
  @ApiBadRequestResponse({ type: MassFixPriceSaleBadRequestError })
  @UseGuards(AuthGuard, MainSaleSeedGuard)
  @UsePipes(
    new ValidationPipe({
      transform: true,
    }),
  )
  async massFixPriceSale(@Body() data: MassFixPriceSaleDTO): Promise<MassFixPriceSaleResult> {
    return await this.collectionsService.massFixPriceSale(data);
  }
}
