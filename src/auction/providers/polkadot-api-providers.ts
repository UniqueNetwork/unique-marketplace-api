import { Logger, Provider, Scope } from "@nestjs/common";
import { ApiPromise, WsProvider } from "@polkadot/api";
import * as defs from "@unique-nft/types/definitions";
import { ApiInterfaceEvents } from "@polkadot/api/types";
import { MarketConfig } from "../../config/market-config";

const waitConnectionReady = async (api: ApiPromise, logger: Logger, wsEndpoint: string): Promise<ApiPromise> => {
  const apiEvents: ApiInterfaceEvents[] = ['ready', 'connected', 'disconnected', 'error'];

  apiEvents.forEach((event) => {
    api.on(event, () => logger.debug(`${event} (${wsEndpoint})`))
  });

  await api.isReady;

  const [chain, version] = await Promise.all([
    api.rpc.system.chain(),
    api.rpc.system.version(),
  ]);

  logger.log(`${chain} (${wsEndpoint}) version ${version} - ready`);

  return api;
}

const uniqueApiProvider: Provider<Promise<ApiPromise>> = {
  provide: 'UNIQUE_API',
  inject: ['CONFIG'],
  useFactory: async (config: MarketConfig) => {
    const logger = new Logger('UNIQUE_API');

    const { wsEndpoint } = config.blockchain.unique;
    const wsProvider = new WsProvider(wsEndpoint);

    const api = new ApiPromise({
      provider: wsProvider,
      rpc: { unique: defs.unique.rpc },
    });

    return await waitConnectionReady(api, logger, wsEndpoint);
  },
  scope: Scope.DEFAULT,
}

const kusamaApiProvider: Provider<Promise<ApiPromise>> = {
  provide: 'KUSAMA_API',
  inject: ['CONFIG'],
  useFactory: async (config: MarketConfig) => {
    const logger = new Logger('KUSAMA_API');

    const { wsEndpoint } = config.blockchain.kusama;
    const wsProvider = new WsProvider(wsEndpoint);

    const api = new ApiPromise({
      provider: wsProvider,
    });

    return await waitConnectionReady(api, logger, wsEndpoint);
  },
  scope: Scope.DEFAULT,
}

export const polkadotApiProviders = [
  uniqueApiProvider,
  kusamaApiProvider,
];
