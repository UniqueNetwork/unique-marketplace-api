import { BadRequestException, HttpStatus, Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { MarketConfig } from '../config/market-config';
import { Connection, Repository } from 'typeorm';
import { InjectSentry, SentryService } from '../utils/sentry';
import { SettingsEntity } from '../entity/settings';
import { MarketTypeStatusEnum } from './interfaces/market.interface';

@Injectable()
export class MarketTypeService implements OnModuleInit {
  private readonly logger = new Logger(MarketTypeService.name);
  private readonly settingsRepository: Repository<SettingsEntity>;
  constructor(
    @Inject('CONFIG') private config: MarketConfig,
    @Inject('DATABASE_CONNECTION') private connection: Connection,
    @InjectSentry() private readonly sentryService: SentryService,
  ) {
    this.settingsRepository = connection.getRepository(SettingsEntity);
  }

  async onModuleInit(): Promise<void> {
    const checkType = await this.checkMarketTypeStatus();
    if (!checkType) {
      const setMarketTypeSecondary = await this.settingsRepository.create({ name: 'market_status', property: 'secondary' });
      await this.settingsRepository.save(setMarketTypeSecondary);
    }
  }

  /**
   * Change status marketplace
   * @param status
   */
  async changeMarketType(status: MarketTypeStatusEnum): Promise<any> {
    if (!Object.values(MarketTypeStatusEnum).includes(status)) {
      throw new BadRequestException(`You can not change the marketplace to the specified status ${status}`);
    }
    try {
      const marketStatus = await this.checkMarketTypeStatus();
      await this.settingsRepository.update({ id: marketStatus.id, name: marketStatus.name }, { property: status });
      return { statusCode: HttpStatus.OK, message: `Marketplace change status into ${status}` };
    } catch (e) {
      throw new BadRequestException(`Something went wrong! ${e.message}`);
    }
  }

  /**
   * Checkout status market Primary or Secondary
   */
  async checkMarketTypeStatus() {
    return await this.settingsRepository.findOne({ where: { name: 'market_status' } });
  }
}
