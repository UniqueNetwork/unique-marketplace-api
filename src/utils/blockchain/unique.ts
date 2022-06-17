import { ApiPromise, WsProvider } from '@polkadot/api';
import * as logging from '../logging';
import { transactionStatus, signTransaction } from './polka';
import { RPC } from './rpc';


const connectApi = async function (url, exitOnDisconnect=true, type = 'mainnet') {
  const wsProvider = new WsProvider(url);

  const api = new ApiPromise({
    provider: wsProvider,
    rpc: { unique:  RPC(type) },
  });

  api.on('disconnected', async (value) => {
    if(!exitOnDisconnect) return;
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
}



export { transactionStatus, signTransaction, connectApi }
