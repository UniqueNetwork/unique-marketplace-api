import { Module, Provider, Logger, Scope } from '@nestjs/common';
import { ApiPromise, WsProvider } from '@polkadot/api';
import { ApiInterfaceEvents } from '@polkadot/api/types';
import { MarketConfig } from '../config/market-config';
import { RPC } from '../utils/blockchain';
import { KUSAMA_API_PROVIDER, UNIQUE_API_PROVIDER } from './constants';
import { ConfigModule } from '../config/module';

const waitConnectionReady = async (api: ApiPromise, logger: Logger, wsEndpoint: string): Promise<ApiPromise> => {
  const apiEvents: ApiInterfaceEvents[] = ['ready', 'connected', 'disconnected', 'error'];

  apiEvents.forEach((event) => {
    api.on(event, () => logger.debug(`${event} (${wsEndpoint})`));
  });

  await api.isReady;

  const [chain, version] = await Promise.all([api.rpc.system.chain(), api.rpc.system.version()]);

  logger.log(`${chain} (${wsEndpoint}) version ${version} - ready`);

  return api;
};

const UniqueAPIProvider: Provider<Promise<ApiPromise>> = {
  provide: UNIQUE_API_PROVIDER,
  inject: ['CONFIG'],
  useFactory: async (config: MarketConfig) => {
    const logger = new Logger(UNIQUE_API_PROVIDER);

    const { wsEndpoint } = config.blockchain.unique;
    const wsProvider = new WsProvider(wsEndpoint);

    const api = new ApiPromise({
      provider: wsProvider,
      rpc: { unique: RPC(config.blockchain.unique.network) },
    });

    return await waitConnectionReady(api, logger, wsEndpoint);
  },
  scope: Scope.DEFAULT,
};

const KusamaAPIProvider: Provider<Promise<ApiPromise>> = {
  provide: KUSAMA_API_PROVIDER,
  inject: ['CONFIG'],
  useFactory: async (config: MarketConfig) => {
    const logger = new Logger(KUSAMA_API_PROVIDER);

    const { wsEndpoint } = config.blockchain.kusama;
    const wsProvider = new WsProvider(wsEndpoint);

    const api = new ApiPromise({
      provider: wsProvider,
    });

    return await waitConnectionReady(api, logger, wsEndpoint);
  },
  scope: Scope.DEFAULT,
};

@Module({
  imports: [ConfigModule],
  providers: [UniqueAPIProvider, KusamaAPIProvider],
  exports: [UniqueAPIProvider, KusamaAPIProvider],
})
export class BlockchainModule {}
