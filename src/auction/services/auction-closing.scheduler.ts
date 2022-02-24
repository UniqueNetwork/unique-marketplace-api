import { Inject, Injectable, OnApplicationBootstrap } from "@nestjs/common";
import { SchedulerRegistry } from "@nestjs/schedule";
import { MarketConfig } from "../../config/market-config";
import { AuctionClosingService } from "./auction-closing.service";

@Injectable()
export class AuctionClosingScheduler implements OnApplicationBootstrap {
  constructor(
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly auctionClosingService: AuctionClosingService,
    @Inject('CONFIG') private config: MarketConfig,
  ) {}

  onApplicationBootstrap(): void {
    const stoppingIntervalCallback = this.auctionClosingService.auctionsStoppingIntervalHandler
      .bind(this.auctionClosingService);
    const stoppingInterval = setInterval(stoppingIntervalCallback, 5000);
    this.schedulerRegistry.addInterval('stoppingInterval', stoppingInterval);

    const withdrawingIntervalCallback = this.auctionClosingService.auctionsWithdrawingIntervalHandler
      .bind(this.auctionClosingService);
    const withdrawingInterval = setInterval(withdrawingIntervalCallback, 10_000)
    this.schedulerRegistry.addInterval('withdrawingInterval', withdrawingInterval);
  }
}