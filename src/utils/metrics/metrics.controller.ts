import { Controller, Get } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import * as fs from 'fs';

@ApiTags('Prometheus Metrics')
@Controller('system/metrics')
export class MetricsController {
  constructor(private metricsService: MetricsService) {}

  @Get('/')
  @ApiOperation({
    summary: 'Prometheus metrics',
    description: fs.readFileSync('docs/metrics.md').toString(),
  })
  public metrics(): Promise<string> {
    return this.metricsService.metrics;
  }
}
