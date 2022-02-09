import { Controller, Get } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Prometheus Metrics')
@Controller('api/system/metrics')
export class MetricsController {
  constructor(private metricsService: MetricsService) {}

  @Get('/')
  public metrics(): Promise<string> {
    return this.metricsService.metrics;
  }
}
