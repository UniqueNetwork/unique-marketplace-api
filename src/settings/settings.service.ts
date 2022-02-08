import {Inject, Injectable, Logger} from '@nestjs/common';
import { SettingsDto } from './dto/settings.dto';
import { seedToAddress } from '../utils/blockchain/util';
import { MarketConfig } from "../config/market-config";

@Injectable()
export class SettingsService {
  private preparedSettings: SettingsDto = null;

  private readonly logger = new Logger(SettingsService.name);

  constructor(@Inject('CONFIG') private config: MarketConfig) {}

  async prepareSettings(): Promise<SettingsDto> {
      const { blockchain, auction } = this.config;

      const settings: SettingsDto = {
          blockchain: {
              escrowAddress: await seedToAddress(blockchain.escrowSeed),
              unique: {
                  wsEndpoint: blockchain.unique.wsEndpoint,
                  collectionIds: blockchain.unique.collectionIds,
                  contractAddress: blockchain.unique.contractAddress,
              },
              kusama: {
                  wsEndpoint: blockchain.kusama.wsEndpoint,
                  marketCommission: blockchain.kusama.marketCommission.toString(),
              },
          },
      };

      if (auction.seed) {
        try {
          settings.auction = {
            commission: auction.commission,
            address: await seedToAddress(auction.seed)
          };
        } catch (error) {
          this.logger.warn(error);
        }
      }

      this.preparedSettings = settings;

      return settings;
  }

  async getSettings(): Promise<SettingsDto> {
    return this.preparedSettings || await this.prepareSettings();
  }
}
