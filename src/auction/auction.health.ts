import { PrometheusService } from '../utils/prometheus/prometheus.service';
import { HealthIndicatorResult } from '@nestjs/terminus';

import { BaseHealthIndicator, HealthIndicator } from '../utils/health';
import { AuctionCreationService } from './services/auction-creation.service';

export class OffersHealthIndicator extends BaseHealthIndicator implements HealthIndicator {
  public readonly name = 'AuctionCreationHealthIndicator';
  protected readonly help = 'Status of ' + this.name;

  constructor(private service: AuctionCreationService, protected promClientService: PrometheusService) {
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
