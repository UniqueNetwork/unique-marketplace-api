import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { ApiPromise } from '@polkadot/api';
import { SettingsDto } from './dto/settings.dto';
import { convertAddress, seedToAddress } from '../utils/blockchain/util';
import { MarketConfig } from '../config/market-config';
import { Connection, Repository } from 'typeorm';
import { Collection } from 'src/entity';

@Injectable()
export class SettingsService {
  private preparedSettings: SettingsDto = null;

  private readonly logger = new Logger(SettingsService.name);
  private readonly collectionsRepository: Repository<Collection>;

  constructor(
    @Inject('CONFIG') private config: MarketConfig,
    @Inject(forwardRef(() => 'UNIQUE_API')) private uniqueApi: ApiPromise,
    @Inject('DATABASE_CONNECTION') private db: Connection,
  ) {
    this.collectionsRepository = db.getRepository(Collection);
  }

  async prepareSettings(): Promise<SettingsDto> {
    const { blockchain, auction } = this.config;

    const collectionIds = await this.getCollectionIds();
    const allowedTokens = await this.getAllowedTokens();

    const settings: SettingsDto = {
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

    this.preparedSettings = settings;

    return settings;
  }

  async getSettings(): Promise<SettingsDto> {
    return this.preparedSettings || (await this.prepareSettings());
  }

  async getCollectionIds(): Promise<number[]> {
    const collections = await this.collectionsRepository.find();

    return collections.map((i) => Number(i.id));
  }

  private async getAllowedTokens(): Promise<any> {
    return {};
  }
}
