import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { ApiPromise } from '@polkadot/api';
import { SettingsDto } from './dto/settings.dto';
import { convertAddress, seedToAddress } from '../utils/blockchain/util';
import { MarketConfig } from '../config/market-config';
import { Connection, Repository } from 'typeorm';
import { SettingsEntity } from '../entity/settings';

@Injectable()
export class SettingsService {
  private preparedSettings: SettingsDto = null;
  private readonly settingsRepository: Repository<SettingsEntity>;
  private readonly logger = new Logger(SettingsService.name);

  constructor(
    @Inject('DATABASE_CONNECTION') private connection: Connection,
    @Inject('CONFIG') private config: MarketConfig,
    @Inject(forwardRef(() => 'UNIQUE_API')) private uniqueApi: ApiPromise,
  ) {
    this.settingsRepository = connection.getRepository(SettingsEntity);
  }

  async prepareSettings(): Promise<SettingsDto> {
    const { blockchain, auction } = this.config;
    const statusMarket = await this.getStatusMarketType();
    const settings: SettingsDto = {
      marketType: statusMarket,
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
        let auctionAddress = await seedToAddress(auction.seed);
        auctionAddress = await convertAddress(auctionAddress, this.uniqueApi.registry.chainSS58);

        settings.auction = {
          commission: auction.commission,
          address: auctionAddress,
        };
      } catch (error) {
        this.logger.warn(error);
      }
    }

    this.preparedSettings = settings;

    return settings;
  }

  async getSettings(): Promise<SettingsDto> {
    return await this.prepareSettings();
  }

  private async getStatusMarketType() {
    const statusMarketType = await this.settingsRepository.findOne({ where: { name: 'market_status' } });
    return statusMarketType.property;
  }
}
