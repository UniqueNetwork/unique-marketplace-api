import { Inject, Injectable, Logger, OnApplicationShutdown } from '@nestjs/common';
import { MarketConfig } from '../../../config/market-config';
import { AuctionClosingService } from './auction-closing.service';
import { clearIntervalAsync, setIntervalAsync, SetIntervalAsyncTimer } from 'set-interval-async/dynamic';

@Injectable()
export class AuctionClosingScheduler implements OnApplicationShutdown {
  private readonly logger = new Logger(AuctionClosingScheduler.name);

  private stoppingInterval: SetIntervalAsyncTimer;
  private withdrawingInterval: SetIntervalAsyncTimer;

  constructor(private readonly auctionClosingService: AuctionClosingService, @Inject('CONFIG') private config: MarketConfig) {}

  startIntervals(stopMs = 5000, withdrawMs = 10_000): void {
    this.logger.debug(`starting auction intervals`);

    const stoppingIntervalCallback = this.auctionClosingService.auctionsStoppingIntervalHandler.bind(this.auctionClosingService);
    this.stoppingInterval = setIntervalAsync(stoppingIntervalCallback, stopMs);

    const withdrawingIntervalCallback = this.auctionClosingService.auctionsWithdrawingIntervalHandler.bind(this.auctionClosingService);
    this.withdrawingInterval = setIntervalAsync(withdrawingIntervalCallback, withdrawMs);

    this.logger.debug(`ready`);
  }

  async onApplicationShutdown(signal?: string): Promise<void> {
    this.logger.debug(`Received signal "${signal || ''}", going to shut down`);

    const promises = [];

    if (this.stoppingInterval) {
      promises.push(clearIntervalAsync(this.stoppingInterval).then(() => {
        this.logger.debug(`stopped stoppingInterval`);
      }));
    }

    if (this.withdrawingInterval) {
      promises.push(clearIntervalAsync(this.withdrawingInterval).then(() => {
        this.logger.debug(`stopped withdrawingInterval`);
      }));
    }

    await Promise.all(promises);

    this.logger.debug(`ready`);
  }
}
