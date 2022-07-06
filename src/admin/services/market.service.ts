import { Injectable, OnModuleInit, Logger, Inject } from '@nestjs/common';
import { MarketConfig, MarketType } from '../..//config/market-config';
import { MassCancelingService } from './mass-canceling.service';

@Injectable()
export class MarketService implements OnModuleInit {
  private readonly logger: Logger;

  constructor(@Inject('CONFIG') private readonly config: MarketConfig, private readonly massCancelingService: MassCancelingService) {
    this.logger = new Logger(MarketService.name);
  }

  async onModuleInit(): Promise<void> {
    const { marketType } = this.config;

    this.logger.debug(`Market initialized as ${marketType}`);

    if (marketType === MarketType.SECONDARY) return;

    this.logger.debug('Closing all secondary market offers ...');

    //const { message } = await this.massCancelingService.massCancel();

    //this.logger.debug(message);
  }
}
