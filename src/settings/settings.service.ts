import { Inject, Injectable } from '@nestjs/common';
import { SettingsDto } from './dto/settings.dto';
import { seedToAddress } from '../utils/blockchain/util';

@Injectable()
export class SettingsService {
  constructor(@Inject('CONFIG') private config) {}

    /**
     * Giving settings for the frontend
     * @return ({Promise<SettingsDto>})
     */
    async getConfig(): Promise<SettingsDto> {
        const config = this.config;
        const result = {
            blockchain: {
                escrowAddress: await seedToAddress(config.blockchain.escrowSeed),
                unique: {
                    wsEndpoint: config.blockchain.unique.wsEndpoint,
                    collectionIds: config.blockchain.unique.collectionIds,
                    contractAddress: config.blockchain.unique.contractAddress,
                },
                kusama: {
                    wsEndpoint: config.blockchain.kusama.wsEndpoint,
                    marketCommission: config.blockchain.kusama.marketCommission,
                },
            },
        };

        return result;
    }
}
