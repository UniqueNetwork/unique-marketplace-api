import { cyan } from 'cli-color';
import { ProxyCollection } from '../blockchain';
import * as unique from '../blockchain/unique';

export const main = async (moduleRef, args: string[]) => {
  const config = moduleRef.get('CONFIG', { strict: false });

  const api = await unique.connectApi(config.blockchain.unique.wsEndpoint, false, config.blockchain.unique.network);

  console.log(cyan('WS endpoint:'), config.blockchain.unique.wsEndpoint);

  const proxyCollection = ProxyCollection.getInstance(api);

  const collection = await proxyCollection.getById(2);


  console.dir(collection, { depth: 3 });


  await api.disconnect();
};