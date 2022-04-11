import { KeyringPair } from '@polkadot/keyring/types';
import { Provider } from '@nestjs/common';
import { MarketConfig } from '../../config/market-config';
import { ApiPromise, Keyring } from '@polkadot/api';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import { convertAddress } from '../../utils/blockchain/util';

export type AuctionCredentials = {
  keyring?: KeyringPair;
  uniqueAddress: string;
  kusamaAddress: string;
};

export const auctionCredentialsProvider: Provider = {
  provide: 'AUCTION_CREDENTIALS',
  inject: ['CONFIG', 'UNIQUE_API', 'KUSAMA_API'],
  useFactory: async (config: MarketConfig, uniqueApi: ApiPromise, kusamaApi: ApiPromise) => {
    const auctionCredentials: AuctionCredentials = {
      uniqueAddress: '',
      kusamaAddress: '',
    };

    if (config.auction.seed) {
      await cryptoWaitReady();
      const keyring = new Keyring({ type: 'sr25519' }).addFromUri(config.auction.seed);

      const [uniqueAddress, kusamaAddress] = await Promise.all([
        convertAddress(keyring.address, uniqueApi.registry.chainSS58),
        convertAddress(keyring.address, kusamaApi.registry.chainSS58),
      ]);

      auctionCredentials.keyring = keyring;
      auctionCredentials.uniqueAddress = uniqueAddress;
      auctionCredentials.kusamaAddress = kusamaAddress;
    }

    return auctionCredentials;
  },
};
