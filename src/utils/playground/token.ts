import { cyan } from 'cli-color';
import * as unique from '../blockchain/unique';
import { ProxyCollection, ProxyToken } from '../blockchain';

export const main = async (moduleRef, args: string[]) => {
  const config = moduleRef.get('CONFIG', { strict: false });
  const api = await unique.connectApi(config.blockchain.unique.wsEndpoint, false);

  console.log(cyan('WS endpoint:'), config.blockchain.unique.wsEndpoint);

  const Token = ProxyToken.getInstance(api);
  const Collection = ProxyCollection.getInstance(api);

  const collection = await Collection.getById(67);

  const token = await Token.tokenIdSchema(1, 67, collection.schema);

  console.dir(token, { depth: 3 });


  await api.disconnect();
};