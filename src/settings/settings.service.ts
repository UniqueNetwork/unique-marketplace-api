import { Injectable } from '@nestjs/common';
import { getConfig } from '../config';
import { SettingsDto } from './dto/settings.dto';

@Injectable()
export class SettingsService {
    /**
     * Giving settings for the frontend
     * @return ({Promise<SettingsDto>})
     */
    async getConfig(): Promise<SettingsDto> {
        const config = getConfig();
        const result = {
            blockchain: {
                escrow: {
                    adress: config.blockchain.escrowSeed,
                },
                unique: {
                    wsEndpoint: config.blockchain.unique.wsEndpoint,
                    collectionIds: config.blockchain.unique.collectionIds,
                    collectionAddress: config.blockchain.unique.collectionAddress,
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
