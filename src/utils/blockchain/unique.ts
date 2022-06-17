import { ApiPromise, WsProvider } from '@polkadot/api';
import * as defs from '@unique-nft/types/definitions';

import * as logging from '../logging';

const connectApi = async function (opalUrl, exitOnDisconnect = true) {
  const wsProvider = new WsProvider(opalUrl);

  const api = new ApiPromise({
    provider: wsProvider,
    rpc: { unique: defs.unique.rpc },
  });

  api.on('disconnected', async (value) => {
    if (!exitOnDisconnect) return;
    logging.log(`[unique] disconnected: ${value}`, logging.level.WARNING);
    process.exit(1);
  });
  api.on('error', async (value) => {
    logging.log(`[unique] error`, logging.level.ERROR);
    logging.log(value, logging.level.ERROR);
    process.exit(1);
  });

  await api.isReady;

  return api;
};

export { connectApi };
