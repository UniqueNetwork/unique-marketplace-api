import { Test, TestingModule } from '@nestjs/testing';

import { SettingsController, SettingsService } from '../src/settings';
import { getConfig, mergeDeep } from '../src/config';
import { ConfigModule } from "../src/config/module";

const EXPECTED = {
  escrowAddress: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
  wsEndpoint: 'ws://opal.local',
  collectionIds: [1, 2, 3],
  contractAddress: '0xfB973B8639de5fF326a0A4EBbDfb92Fc86860Ef2',
  kusamaWSEndpoint: 'ws://kusama.local',
  marketCommission: 20
}

describe('Settings service', () => {
    let settingsController: SettingsController;
    let configData = getConfig();
    beforeEach(async () => {
        const app: TestingModule = await Test.createTestingModule({
            imports: [ConfigModule],
            controllers: [SettingsController],
            providers: [SettingsService],
        }).overrideProvider('CONFIG').useFactory({
          factory: () => {
            return mergeDeep(configData, {
              blockchain: {
                escrowSeed: '//Alice',
                unique: {
                  wsEndpoint: EXPECTED.wsEndpoint,
                  collectionIds: EXPECTED.collectionIds,
                  contractAddress: EXPECTED.contractAddress
                },
                kusama: {
                  wsEndpoint: EXPECTED.kusamaWSEndpoint,
                  marketCommission: EXPECTED.marketCommission
                }
              }
            });
          }
        }).compile();

        settingsController = app.get<SettingsController>(SettingsController);
    });

    describe('getSettings', () => {
        it('should return kusama wsEndpoint', async () => {
            const response = await settingsController.getSettings();

            expect(response.blockchain.kusama.wsEndpoint).toBe(EXPECTED.kusamaWSEndpoint);
        });

        it('should return kusama marketCommission', async () => {
            const response = await settingsController.getSettings();

            expect(response.blockchain.kusama.marketCommission).toBe(EXPECTED.marketCommission);
        });

        it('should return unique wsEndpoint', async () => {
            const response = await settingsController.getSettings();
            expect(response.blockchain.unique.wsEndpoint).toBe(EXPECTED.wsEndpoint);
        });

        it('should return unique collectionIds', async () => {
            const response = await settingsController.getSettings();
            expect(response.blockchain.unique.collectionIds).toBe(EXPECTED.collectionIds);
        });

        it('should return unique contractAddress', async () => {
            const response = await settingsController.getSettings();
            expect(response.blockchain.unique.contractAddress).toBe(EXPECTED.contractAddress);
        });

        it('should return escrowAddress', async () => {
            const response = await settingsController.getSettings();
            expect(response.blockchain.escrowAddress).toBe(EXPECTED.escrowAddress);
        });
    });
});
