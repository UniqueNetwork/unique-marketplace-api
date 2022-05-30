import { Body, Controller, Get, Headers, HttpStatus, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { ApiBearerAuth, ApiForbiddenResponse, ApiHeader, ApiOperation, ApiQuery, ApiResponse, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { AuthGuard } from './guards/auth.guard';
import { Request } from 'express';
import { ResponseAdminDto, ResponseAdminErrorDto } from './dto/response-admin.dto';
import { AddCollectionDTO, RemoveCollectionDTO } from './dto/collections.dto';

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

  @Get('/collection/list')
  @ApiBearerAuth()
  @ApiOperation({ description: 'List collection' })
  @UseGuards(AuthGuard)
  async listCollection() {
    return await this.adminService.listCollection();
  }

  @Post('/collection/add')
  @ApiBearerAuth()
  @ApiOperation({ description: 'Create collection' })
  @UseGuards(AuthGuard)
  async createCollection(@Body() data: AddCollectionDTO) {
    return await this.adminService.createCollection(data.collectionId);
  }

  @Post('/collection/remove')
  @ApiOperation({ description: 'Remove collection' })
  // @UseGuards(AuthGuard)
  @ApiBearerAuth()
  async removeCollection(@Body() data: RemoveCollectionDTO) {
    return await this.adminService.removeCollection(data.collectionId);
  }
}
