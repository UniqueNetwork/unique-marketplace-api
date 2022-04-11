import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { HealthService } from './health.service';
import { HealthCheckResult } from '@nestjs/terminus';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import * as fs from 'fs';

@ApiTags('Health Check')
@Controller('system/health')
export class HealthController {
  constructor(private healthService: HealthService) {}

  @Get('/')
  @ApiOperation({
    summary: 'Check health status all endpoints.',
    description: fs.readFileSync('docs/helpcheck.md').toString(),
  })
  public async check(): Promise<HealthCheckResult | undefined> {
    const healthCheckResult: HealthCheckResult | undefined = await this.healthService.check();
    for (const key in healthCheckResult?.info) {
      if (healthCheckResult?.info[key].status === 'down') {
        throw new ServiceUnavailableException(healthCheckResult);
      }
    }
    return healthCheckResult;
  }
}
