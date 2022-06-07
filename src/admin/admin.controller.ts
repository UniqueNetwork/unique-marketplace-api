import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Query, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { AdminService } from './admin.service';
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
import { AuthGuard, MainSaleSeedGuard } from './guards';
import {
  AddTokensDto,
  CollectionsFilter,
  DisableCollectionBadRequestError,
  DisableCollectionNotFoundError,
  DisableCollectionResult,
  EnableCollectionBadRequestError,
  EnableCollectionDTO,
  EnableCollectionResult,
  ListCollectionBadRequestError,
  ListCollectionResult,
  MassFixPriceSaleBadRequestError,
  MassFixPriceSaleDTO,
  MassFixPriceSaleResult,
  ResponseAdminDto,
  ResponseAdminForbiddenDto,
  ResponseAdminUnauthorizedDto,
  ResponseTokenDto,
} from './dto';
import { CollectionsFilterPipe, ParseCollectionIdPipe } from './pipes';
import { CollectionsService, TokenService } from './servises';
import * as fs from 'fs';
import { LoginGuard } from './guards/login.guard';

@ApiTags('Administration')
@ApiBearerAuth()
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
  @UseGuards(LoginGuard)
  @ApiQuery({ name: 'account', description: 'Substrate account', example: '5EsQUxc6FLEJKgCwWbiC4kBuCbBt6ePtdKLvVP5gfpXkrztf' })
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
  @ApiBadRequestResponse({ type: ListCollectionBadRequestError })
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
