import { Injectable, Logger } from '@nestjs/common';
import { HealthCheck, HealthCheckResult, HealthCheckService, HttpHealthIndicator } from '@nestjs/terminus';
import { PrometheusService } from '../prometheus/prometheus.service';
import { HealthIndicator } from './interfaces/health-indicator.interface';
import { AppHealthIndicator } from './indicators/app-health.indicator';

import { OffersService } from '../../offers/offers.service';
import { OffersHealthIndicator } from '../../offers/offers.health';
import { TradesService } from '../../trades/trades.service';
import { TradesHealthIndicator } from '../../trades/trades.health';

@Injectable()
export class HealthService {
  private readonly listOfThingsToMonitor: HealthIndicator[];
  private readonly logger = new Logger(HealthService.name);

  constructor(
    private health: HealthCheckService,
    private http: HttpHealthIndicator,
    private promClientService: PrometheusService,
    private offersService: OffersService,
    private tradesService: TradesService,
  ) {
    this.listOfThingsToMonitor = [
      new AppHealthIndicator(this.http, 'http://localhost:5000', this.promClientService),
      new OffersHealthIndicator(this.offersService, this.promClientService),
      new TradesHealthIndicator(this.tradesService, this.promClientService),
    ];
  }

  @HealthCheck()
  public async check(): Promise<HealthCheckResult | undefined> {
    return await this.health.check(
      this.listOfThingsToMonitor.map((apiIndicator: HealthIndicator) => async () => {
        try {
          return await apiIndicator.isHealthy();
        } catch (e) {
          this.logger.warn(e);
          return apiIndicator.reportUnhealthy();
        }
      }),
    );
  }
}
