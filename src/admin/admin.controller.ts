import { Body, Controller, Delete, Get, Headers, HttpCode, HttpStatus, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { ApiBearerAuth, ApiForbiddenResponse, ApiHeader, ApiOperation, ApiQuery, ApiResponse, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { AuthGuard } from './guards/auth.guard';
import { Request } from 'express';
import {
  AddTokensDto,
  DisableCollectionResult,
  ImportCollectionResult,
  ListCollectionResult,
  ResponseAdminDto,
  ResponseAdminErrorDto,
  ResponseCreateDto,
} from './dto';
import { ParseCollectionIdPipe } from './pipes/parse-collection-id.pipe';
import { CollectionImportType } from './types/collection';
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
  @UseGuards(AuthGuard)
  async listCollection(): Promise<ListCollectionResult> {
    const collections = await this.collectionsService.findAll();

    return {
      statusCode: HttpStatus.OK,
      message: '',
      data: collections,
    };
  }

  @Post('/collections')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ description: 'Import collection' })
  @UseGuards(AuthGuard)
  async importCollection(@Body('collectionId', ParseCollectionIdPipe) collectionId: number): Promise<ImportCollectionResult> {
    const { message } = await this.collectionsService.importById(collectionId, CollectionImportType.Api);

    const collection = await this.collectionsService.enableById(collectionId);

    return {
      statusCode: HttpStatus.OK,
      message,
      data: collection,
    };
  }

  @Delete('/collections/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ description: 'Disable collection' })
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  async disableCollection(@Param('id', ParseCollectionIdPipe) collectionId: number): Promise<DisableCollectionResult> {
    const collection = await this.collectionsService.disableById(collectionId);

    return {
      statusCode: HttpStatus.OK,
      message: `Сollection #${collection.id} successfully disabled`,
      data: collection,
    };
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
