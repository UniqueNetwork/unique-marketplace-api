import { Body, Controller, Delete, Get, Headers, HttpStatus, Param, ParseIntPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { ApiBearerAuth, ApiForbiddenResponse, ApiHeader, ApiOperation, ApiQuery, ApiResponse, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { AuthGuard } from './guards/auth.guard';
import { Request } from 'express';

import { Collection } from 'src/entity';
import { AddCollectionDTO, AddTokensDto, ResponseAdminDto, ResponseAdminErrorDto } from './dto';

@ApiTags('Administration')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('/login')
  @ApiOperation({ description: 'User authorization' })
  @ApiHeader({ name: 'Signature', description: 'signature' })
  @ApiQuery({ name: 'account', description: 'Substrate account', example: '5EsQUxc6FLEJKgCwWbiC4kBuCbBt6ePtdKLvVP5gfpXkrztf' })
  @ApiResponse({ status: HttpStatus.OK, type: ResponseAdminDto })
  @ApiUnauthorizedResponse({ description: 'Unauthorized address or bad signature', type: ResponseAdminErrorDto })
  @ApiForbiddenResponse({ description: 'Forbidden. Marketplace disabled management for administrators.', type: ResponseAdminErrorDto })
  async login(
    @Headers('Signature') signature = '',
    @Query('account') signerAddress: string,
    @Req() req: Request,
  ): Promise<ResponseAdminDto | ResponseAdminErrorDto> {
    const queryString = req.originalUrl.split('?')[0];
    return await this.adminService.login(signerAddress, signature, queryString);
  }

  @Get('/collections')
  @ApiBearerAuth()
  @ApiOperation({ description: 'List collection' })
  @UseGuards(AuthGuard)
  async listCollection(): Promise<Collection[]> {
    return await this.adminService.listCollection();
  }

  @Post('/collections')
  @ApiBearerAuth()
  @ApiOperation({ description: 'Create collection' })
  @UseGuards(AuthGuard)
  async createCollection(@Body() data: AddCollectionDTO): Promise<Collection> {
    return await this.adminService.createCollection(data.collectionId);
  }

  @Delete('/collections/:id')
  @ApiOperation({ description: 'Remove collection' })
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  async removeCollection(@Param('id', ParseIntPipe) collectionId: number): Promise<Collection> {
    return await this.adminService.removeCollection(collectionId);
  }

  @Post('/tokens/:collectionId')
  //@ApiBearerAuth()
  @ApiOperation({ description: 'Add allowed tokens' })
  //@UseGuards(AuthGuard)
  async addTokens(@Param('collectionId') collectionId: string, @Body() data: AddTokensDto): Promise<any> {
    return await this.adminService.addTokens(collectionId, data);
  }
}
