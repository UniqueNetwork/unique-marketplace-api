import { PrometheusService } from '../utils/prometheus/prometheus.service';
import { HealthIndicatorResult } from '@nestjs/terminus';
import { BaseHealthIndicator, HealthIndicator } from '../utils/health';
import { AdminService } from './services';

export class AdminHealthIndicator extends BaseHealthIndicator implements HealthIndicator {
  public readonly name = AdminHealthIndicator.name;
  protected readonly help = 'Status of ' + this.name;

  constructor(private service: AdminService, protected promClientService: PrometheusService) {
    super();
    this.registerMetrics();
    this.registerGauges();
  }

  public async isHealthy(): Promise<HealthIndicatorResult> {
    const isHealthy = this.service.isConnected;
    this.updatePrometheusData(isHealthy);
    return this.getStatus(this.name, isHealthy);
  }
}
