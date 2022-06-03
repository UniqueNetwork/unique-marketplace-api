import { Body, Controller, Delete, Get, Headers, HttpCode, HttpStatus, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
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
import { AuthGuard } from './guards/auth.guard';
import { Request } from 'express';
import {
  AddTokensDto,
  DisableCollectionResult,
  EnableCollectionDTO,
  EnableCollectionResult,
  ListCollectionResult,
  ResponseAdminDto,
  ResponseAdminErrorDto,
  ResponseCreateDto,
  CollectionsFilter,
  ListCollectionBadRequestError,
  EnableCollectionBadRequestError,
  DisableCollectionNotFoundError,
  DisableCollectionBadRequestError,
} from './dto';
import { ParseCollectionIdPipe, CollectionsFilterPipe } from './pipes';
import { CollectionsService, TokenService } from './servises';

@ApiTags('Administration')
@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly collectionsService: CollectionsService,
    private readonly tokenService: TokenService,
  ) {}

  @Post('/login')
  @ApiOperation({ description: 'User authorization' })
  @ApiHeader({ name: 'Signature', description: 'signature' })
  @ApiQuery({ name: 'account', description: 'Substrate account', example: '5EsQUxc6FLEJKgCwWbiC4kBuCbBt6ePtdKLvVP5gfpXkrztf' })
  @ApiResponse({ status: HttpStatus.OK, type: ResponseAdminDto })
  @ApiUnauthorizedResponse({ description: 'Unauthorized address or bad signature', type: ResponseAdminErrorDto })
  @ApiForbiddenResponse({ description: 'Forbidden. Marketplace disabled management for administrators.', type: ResponseAdminErrorDto })
  async login(@Headers('Signature') signature = '', @Query('account') signerAddress: string, @Req() req: Request): Promise<ResponseAdminDto> {
    const queryString = req.originalUrl.split('?')[0];
    return await this.adminService.login(signerAddress, signature, queryString);
  }

  @Get('/collections')
  @HttpCode(HttpStatus.OK)
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
  @ApiOperation({ description: 'Enable collection' })
  @ApiResponse({ status: HttpStatus.OK, type: EnableCollectionResult })
  @ApiBody({ type: EnableCollectionDTO })
  @ApiBadRequestResponse({ type: EnableCollectionBadRequestError })
  @UseGuards(AuthGuard)
  async enableCollection(@Body('collectionId', ParseCollectionIdPipe) collectionId: number): Promise<EnableCollectionResult> {
    return await this.collectionsService.enableById(collectionId);
  }

  @Delete('/collections/:id')
  @HttpCode(HttpStatus.OK)
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
  @ApiBearerAuth()
  @ApiOperation({ description: 'Add allowed tokens' })
  @UseGuards(AuthGuard)
  async addTokens(@Param('collectionId') collectionId: string, @Body() data: AddTokensDto): Promise<ResponseCreateDto> {
    return await this.tokenService.addTokens(collectionId, data);
  }
}
