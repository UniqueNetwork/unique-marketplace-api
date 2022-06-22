import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { ApiPromise } from '@polkadot/api';
import { Connection, Not, Repository } from 'typeorm';

import { SettingsDto } from './dto';

import { convertAddress, seedToAddress } from '../utils/blockchain/util';
import { MarketConfig } from '../config/market-config';
import { Collection } from '../entity';
import { CollectionStatus } from '../admin/types/collection';
import { UNIQUE_API_PROVIDER } from '../blockchain';

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);
  private readonly collectionsRepository: Repository<Collection>;

  constructor(
    @Inject('CONFIG') private config: MarketConfig,
    @Inject(forwardRef(() => UNIQUE_API_PROVIDER)) private uniqueApi: ApiPromise,
    @Inject('DATABASE_CONNECTION') private connection: Connection,
  ) {
    this.collectionsRepository = connection.getRepository(Collection);
  }

  async prepareSettings(): Promise<SettingsDto> {
    const { blockchain, auction, marketType, mainSaleSeed, adminList } = this.config;

    const collectionIds = await this.getCollectionIds();
    const allowedTokens = await this.getAllowedTokens();
    const administrators = adminList.split(',').map((value) => value.trim());
    const settings: SettingsDto = {
      marketType: marketType,
      administrators: administrators,
      mainSaleSeedAddress: await seedToAddress(mainSaleSeed),
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

  async getSettings(): Promise<SettingsDto> {
    return await this.prepareSettings();
  }

  async getCollectionIds(): Promise<number[]> {
    const collections = await this.collectionsRepository.find({ status: CollectionStatus.Enabled });

    return collections.map((i) => Number(i.id));
  }

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
