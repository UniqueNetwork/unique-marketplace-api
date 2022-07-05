import { Inject, Injectable, Logger } from '@nestjs/common';
import { HealthCheck, HealthCheckResult, HealthCheckService, HttpHealthIndicator } from '@nestjs/terminus';
import { PrometheusService } from '../prometheus/prometheus.service';
import { HealthIndicator } from './interfaces/health-indicator.interface';
import { OffersHealthIndicator, OffersService } from '../../offers';
import { TradesHealthIndicator, TradesService } from '../../trades';
import { AdminHealthIndicator } from '../../admin/admin.health';
import { AdminService } from '../../admin/services/admin.service';

@Injectable()
export class HealthService {
  private readonly listOfThingsToMonitor: HealthIndicator[];
  private readonly logger = new Logger(HealthService.name);

  constructor(
    @Inject('CONFIG') private readonly config,
    private health: HealthCheckService,
    private http: HttpHealthIndicator,
    private promClientService: PrometheusService,
    private offersService: OffersService,
    private tradesService: TradesService,
    private adminService: AdminService,
  ) {
    this.listOfThingsToMonitor = [
      //new AppHealthIndicator(this.http, 'http://localhost:' + this.config.listenPort, this.promClientService),
      new OffersHealthIndicator(this.offersService, this.promClientService),
      new TradesHealthIndicator(this.tradesService, this.promClientService),
      new AdminHealthIndicator(this.adminService, this.promClientService),
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
