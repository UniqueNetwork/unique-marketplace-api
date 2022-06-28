import { Inject, Injectable } from '@nestjs/common';
import * as unique from '../../utils/blockchain/unique';
import { cyan, yellow, bgRed, bgGreen, black } from 'cli-color';
import { ProxyCollection, ProxyToken } from '../../utils/blockchain';
import { MarketConfig } from '../../config/market-config';
import { ICollectionCommand } from '../interfaces/collection.interface';

@Injectable()
export class CollectionCommandService {
  constructor(@Inject('CONFIG') private config: MarketConfig) {}

  async showCollection(data: ICollectionCommand): Promise<any> {
    const { collection, token, depth, wss } = data;

    // Checkout flag wss endpoint
    const api =
      wss != undefined ? await unique.connectApi(wss, false) : await unique.connectApi(this.config.blockchain.unique.wsEndpoint, false);
    console.log(cyan('============== WSS Connected =============='), yellow(true));
    console.log(cyan('WS endpoint:'), yellow(this.config.blockchain.unique.wsEndpoint));

    // Checkout collection ID
    const collectionSchema = ProxyCollection.getInstance(api);
    const collectionData = await collectionSchema.getById(+collection);

    console.log(cyan('Collection ID:'), yellow(collection));
    if (collectionData.collection.sponsorship !== undefined || collectionData.collection.sponsorship !== null) {
      Object.entries(collectionData.collection.sponsorship).map(([key, value]) => {
        if (key === 'Unconfirmed') {
          console.log(cyan('Collection Sponsorship:'), bgRed(black(' ' + key.toUpperCase() + ' ')));
        } else {
          console.log(cyan('Collection Sponsorship:'), yellow(value), bgGreen(black(' ' + key.toUpperCase() + ' ')));
        }
      });
    }

    console.dir(collectionData, { depth: depth });

    // Checkout token id
    if (token) {
      const tokenData = ProxyToken.getInstance(api);
      const tokenShema = await tokenData.tokenIdSchema(+token, +collection, collectionData.schema);
      console.log(cyan('Token:'), yellow(token));
      console.dir(tokenShema, { depth: depth });
    }

    await api.disconnect();
    console.log(cyan('============== WSS Disconnected =============='), yellow(true));
    process.exit(0);
  }
}
