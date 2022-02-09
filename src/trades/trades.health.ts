import { BaseHealthIndicator } from '../utils/health/indicators/base-health.indicator';
import { HealthIndicator } from '../utils/health/interfaces/health-indicator.interface';
import { PrometheusService } from '../utils/prometheus/prometheus.service';
import { HealthIndicatorResult } from '@nestjs/terminus';
import { TradesService } from './trades.service';

export class TradesHealthIndicator extends BaseHealthIndicator implements HealthIndicator {
  public readonly name = TradesHealthIndicator.name;
  protected readonly help = 'Status of ' + this.name;

  constructor(private service: TradesService, protected promClientService: PrometheusService) {
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
