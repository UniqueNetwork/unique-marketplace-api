import { Logger, Provider, Scope } from "@nestjs/common";
import { ApiPromise, WsProvider } from "@polkadot/api";
import * as defs from "@unique-nft/types/definitions";
import { ApiInterfaceEvents } from "@polkadot/api/types";
import { MarketConfig } from "../../config/market-config";

// todo - make global?
export const kusamaApiProvider: Provider<Promise<ApiPromise>> = {
  provide: 'KusamaApi',
  inject: ['CONFIG'],
  useFactory: async (config: MarketConfig) => {
    const logger = new Logger('UniqueApi');

    const { wsEndpoint } = config.blockchain.kusama;

    const wsProvider = new WsProvider(wsEndpoint);

    const api = new ApiPromise({
      provider: wsProvider,
      rpc: { unique: defs.unique.rpc },
    });

    const apiEvents: ApiInterfaceEvents[] = ['ready', 'connected', 'disconnected', 'error'];

    apiEvents.forEach((event) => {
      api.on(event, () => logger.debug(`${wsEndpoint} - ${event}`))
    });

    await api.isReady;

    logger.debug(`${wsEndpoint} - ${await api.rpc.system.name()}`);

    return api;
  },
  scope: Scope.DEFAULT,
}