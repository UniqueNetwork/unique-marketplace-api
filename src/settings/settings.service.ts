import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { ApiPromise } from '@polkadot/api';
import { Connection, Not, Repository } from 'typeorm';

import { SettingsDto } from './dto';

import { convertAddress, seedToAddress } from '../utils/blockchain/util';
import { MarketConfig } from '../config/market-config';
import { Collection } from '../entity';
import { CollectionStatus } from '../admin/types/collection';
import { UNIQUE_API_PROVIDER } from '../blockchain';
import { SettingsEntity } from '../entity/settings';

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);
  private readonly collectionsRepository: Repository<Collection>;
  private readonly settingsRepository: Repository<SettingsEntity>;

  constructor(
    @Inject('CONFIG') private config: MarketConfig,
    @Inject(forwardRef(() => UNIQUE_API_PROVIDER)) private uniqueApi: ApiPromise,
    @Inject('DATABASE_CONNECTION') private connection: Connection,
  ) {
    this.collectionsRepository = connection.getRepository(Collection);
    this.settingsRepository = connection.getRepository(SettingsEntity);
  }

  /**
   * Prepare settings for market
   * @returns {Promise<SettingsDto>}
   */
  async prepareSettings(): Promise<SettingsDto> {
    let mainSaleAddress;
    const { blockchain, auction, marketType, mainSaleSeed, adminList } = this.config;
    // Admin list
    const administrators = adminList.split(',').map((value) => value.trim());
    // Main sale address
    if (this.config.mainSaleSeed && this.config.mainSaleSeed != '') {
      try {
        mainSaleAddress = await seedToAddress(mainSaleSeed);
        administrators.push(mainSaleAddress);
      } catch (e) {
        this.logger.error('Main sale seed is invalid');
      }
    }

    // Collections list
    const collectionIds = await this.getCollectionIds();
    // Allowed tokens
    const allowedTokens = await this.getAllowedTokens();

    const settings: SettingsDto = {
      marketType: marketType,
      administrators: administrators,
      mainSaleSeedAddress: mainSaleAddress,
      blockchain: {
        escrowAddress: await seedToAddress(blockchain.escrowSeed),
        unique: {
          wsEndpoint: blockchain.unique.wsEndpoint,
          collectionIds,
          allowedTokens,
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

    return settings;
  }

  /**
   * Get settings
   *  @returns {Promise<SettingsDto>}
   */
  async getSettings(): Promise<SettingsDto> {
    return await this.prepareSettings();
  }

  /**
   * Get collections ids
   * @returns {Promise<number[]>}
   */
  async getCollectionIds(): Promise<number[]> {
    const collections = await this.collectionsRepository.find({ status: CollectionStatus.Enabled });

    return collections.map((i) => Number(i.id));
  }

  /**
   * Set first launch market
   * @returns {Promise<void>}
   */
  async markFirstLaunchMarket(): Promise<void> {
    const settings = await this.settingsRepository.findOne({
      where: { name: 'firstLaunchMarket' },
    });

    if (!settings) {
      await this.settingsRepository.save({
        name: 'firstLaunchMarket',
        property: 'true',
      });
    }
  }

  /**
   * Get first launch market
   *  @returns {Promise<boolean>}
   */
  async isFirstLaunchMarket(): Promise<boolean> {
    const settings = await this.settingsRepository.findOne({
      where: { name: 'firstLaunchMarket' },
    });
    return settings ? true : false;
  }

  /**
   * Get allowed tokens
   * @returns {Promise<string[]>}
   * @private
   */
  private async getAllowedTokens(): Promise<any> {
    const collections = await this.collectionsRepository.find({
      status: CollectionStatus.Enabled,
      allowedTokens: Not(''),
    });
    return collections.map((i) => {
      return { collection: Number(i.id), tokens: i.allowedTokens };
    });
  }
}
