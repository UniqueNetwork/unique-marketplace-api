import { Controller, Get, HttpStatus } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { SettingsDto } from './dto/settings.dto';

@ApiTags('Settings')
@Controller('api/settings')
export class SettingsController {
    constructor(private readonly settingsService: SettingsService) {}

    @Get('/')
    @ApiResponse({ type: SettingsDto, status: HttpStatus.OK })
    async getSettings() {
        return await this.settingsService.getConfig();
    }
}
