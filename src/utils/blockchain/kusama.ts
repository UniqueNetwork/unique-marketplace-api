import { ApiPromise, WsProvider } from '@polkadot/api';

import * as logging from '../logging';

const connectApi = async function (kusamaUrl, exitOnDisconnect = true) {
  const wsProvider = new WsProvider(kusamaUrl);

  const api = new ApiPromise({
    provider: wsProvider,
  });

  api.on('disconnected', async (value) => {
    if (!exitOnDisconnect) return;
    logging.log(`[kusama] disconnected: ${value}`, logging.level.WARNING);
    process.exit(1);
  });
  api.on('error', async (value) => {
    logging.log(`[kusama] error`, logging.level.ERROR);
    logging.log(value, logging.level.ERROR);
    process.exit(1);
  });

  await api.isReady;

  return api;
};

export { connectApi };
