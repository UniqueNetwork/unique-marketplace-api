import { Controller, Patch, Post, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from './guards/auth.guard';

@ApiTags('Administration')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('/login')
  @ApiOperation({ description: 'User authorization' })
  async login() {
    return await this.adminService.login({});
  }

  @Post('/refresh_token')
  @ApiOperation({ description: 'Refresh authorization token' })
  async refreshToken() {
    return await this.adminService.refreshToken({});
  }

  @Post('/collection/add')
  @ApiOperation({ description: 'Create collection' })
  @UseGuards(AuthGuard)
  async createCollection() {
    return await this.adminService.createCollection({});
  }

  @Post('/collection/remove')
  @ApiOperation({ description: 'Remove collection' })
  @UseGuards(AuthGuard)
  async removeCollection() {
    return await this.adminService.removeCollection({});
  }
}
