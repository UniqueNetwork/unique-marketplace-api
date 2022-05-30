import { Logger, Provider } from '@nestjs/common';
import { ApiPromise, WsProvider } from '@polkadot/api';
import { unique } from '@unique-nft/types/definitions';
import { MarketConfig } from 'src/config/market-config';
import { UNIQUE_API_PROVIDER_TOKEN } from '../constants';

export const UniqueAPIProvider: Provider<Promise<ApiPromise>> = {
  provide: UNIQUE_API_PROVIDER_TOKEN,
  inject: ['CONFIG'],
  useFactory: async (config: MarketConfig) => {
    const logger = new Logger('UNIQUE_API');

    const { wsEndpoint } = config.blockchain.unique;
    const wsProvider = new WsProvider(wsEndpoint);

    const api = new ApiPromise({ provider: wsProvider, rpc: { unique: unique.rpc } });

    await api.isReady;

    const [chain, nodeName, nodeVersion] = await Promise.all([api.rpc.system.chain(), api.rpc.system.name(), api.rpc.system.version()]);

    logger.debug(`Connected to ${chain} using ${nodeName} v${nodeVersion} (${wsEndpoint})`);

    return api;
  },
};
