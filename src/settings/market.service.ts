import { Injectable, OnModuleInit, Logger, Inject } from '@nestjs/common';
import { MassCancelingService } from '../admin/services/mass-canceling.service';
import { MarketConfig, MarketType } from '../config/market-config';
import { seedToAddress } from '../utils/blockchain/util';
import { cyan, red, bgRed, black, green } from 'cli-color';

@Injectable()
export class MarketService implements OnModuleInit {
  private readonly logger: Logger;

  constructor(@Inject('CONFIG') private readonly config: MarketConfig, private readonly massCancelingService: MassCancelingService) {
    this.logger = new Logger(MarketService.name);
  }

  async onModuleInit(): Promise<void> {
    await this.checkoutSettings();
    const { marketType } = this.config;

    this.logger.log(`Market initialized as ${marketType}`);

    if (marketType === MarketType.SECONDARY) return;

    this.logger.warn(red('Closing all secondary market offers ...'));

    const { message } = await this.massCancelingService.massCancelSystem();

    this.logger.log(message);
  }

  private async checkoutSettings() {
    const errorStopMessage = bgRed(' ' + black('STOP') + ' ') + ' ';

    if (!this.config.blockchain.unique.contractAddress) {
      this.logger.error('Unique contract address is not defined. Please delploy contract first.');
    }
    if (!this.config.blockchain.unique.wsEndpoint) {
      this.logger.error('Unique websocket endpoint is not defined');
    }
    if (!this.config.blockchain.kusama.wsEndpoint) {
      this.logger.error('Kusama websocket endpoint is not defined');
    }
    if (!this.config.blockchain.escrowSeed) {
      this.logger.error(errorStopMessage + red('Escrow seed is not defined'));
    } else {
      try {
        await seedToAddress(this.config.blockchain.escrowSeed);
      } catch (e) {
        this.logger.warn(errorStopMessage + red('Escrow seed is invalid'));
      }
    }
    if (!this.config.auction.seed) {
      this.logger.error('Auction seed is not defined');
    }
    if (!this.config.auction.commission) {
      this.logger.error('Auction commission is not defined');
    }
    if (this.config.mainSaleSeed) {
      try {
        await seedToAddress(this.config.mainSaleSeed);
      } catch (e) {
        this.logger.error(errorStopMessage + red('Main sale seed is invalid'));
      }
    }
  }
}
