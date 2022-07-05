import { cyan } from 'cli-color';
import * as unique from '../blockchain/unique';
import { ProxyCollection, ProxyToken } from '../blockchain';

export const main = async (moduleRef) => {
  const config = moduleRef.get('CONFIG', { strict: false });
  const api = await unique.connectApi(config.blockchain.unique.wsEndpoint, false);

  console.log(cyan('WS endpoint:'), config.blockchain.unique.wsEndpoint);

  const Token = ProxyToken.getInstance(api);
  const Collection = ProxyCollection.getInstance(api);

  const collectionId = 2;
  const tokenId = 1;
  const collection = await Collection.getById(collectionId);

  console.dir(collection, { depth: 3 });

  const token = await Token.tokenIdSchema(tokenId, collectionId, collection.schema);

  console.dir(token, { depth: 3 });

  await api.disconnect();
};
