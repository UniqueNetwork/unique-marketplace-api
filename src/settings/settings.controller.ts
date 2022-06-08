import { Controller, Get, HttpStatus, Patch, Query } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SettingsDto } from './dto/settings.dto';
import * as fs from 'fs';
import { MarketTypeStatusEnum } from './interfaces/market.interface';
import { MarketTypeService } from './market.service';

@ApiTags('Settings')
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService, private readonly marketTypeService: MarketTypeService) {}

  @Get('/')
  @ApiResponse({ type: SettingsDto, status: HttpStatus.OK })
  async getSettings(): Promise<SettingsDto> {
    return await this.settingsService.getSettings();
  }

  @Patch('/market/change')
  @ApiOperation({
    summary: 'Change market type',
    description: fs.readFileSync('docs/market-type.md').toString(),
  })
  @ApiQuery({ name: 'status', enum: MarketTypeStatusEnum, example: MarketTypeStatusEnum['secondary'] })
  async setTypeMarket(@Query('status') status: MarketTypeStatusEnum = MarketTypeStatusEnum.secondary) {
    return await this.marketTypeService.changeMarketType(status);
  }
}
