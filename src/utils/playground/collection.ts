import { cyan } from 'cli-color';
import { ProxyCollection } from '../blockchain';
import * as unique from '../blockchain/unique';

export const main = async (moduleRef) => {
  const config = moduleRef.get('CONFIG', { strict: false });
  const api = await unique.connectApi(config.blockchain.unique.wsEndpoint, false);

  console.log(cyan('WS endpoint:'), config.blockchain.unique.wsEndpoint);

  const proxyCollection = ProxyCollection.getInstance(api);

  const collection = await proxyCollection.getById(2);

  console.dir(collection, { depth: 3 });

  await api.disconnect();
};
