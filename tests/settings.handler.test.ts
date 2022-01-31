import { Test, TestingModule } from '@nestjs/testing';

import { SettingsController, SettingsService } from '../src/settings';
import { getConfig } from '../src/config';

describe('Settings service', () => {
    let settingsController: SettingsController;
    let configData = getConfig();
    beforeEach(async () => {
        const app: TestingModule = await Test.createTestingModule({
            controllers: [SettingsController],
            providers: [SettingsService],
        }).compile();

        settingsController = app.get<SettingsController>(SettingsController);
    });

    describe('getSettings', () => {
        it('should return kusama wsEndpoint', async () => {
            const response = await settingsController.getSettings();

            expect(response.blockchain.kusama.wsEndpoint).toBe(configData.blockchain.kusama.wsEndpoint);
        });

        it('should return kusama marketCommission', async () => {
            const response = await settingsController.getSettings();

            expect(response.blockchain.kusama.marketCommission).toBe(configData.blockchain.kusama.marketCommission);
        });

        it('should return unique wsEndpoint', async () => {
            const response = await settingsController.getSettings();
            expect(response.blockchain.unique.wsEndpoint).toBe(configData.blockchain.unique.wsEndpoint);
        });

        it('should return unique wcollectionIds', async () => {
            const response = await settingsController.getSettings();
            expect(response.blockchain.unique.collectionIds).toBe(configData.blockchain.unique.collectionIds);
        });
    });
});
