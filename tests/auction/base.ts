import { ApiPromise } from '@polkadot/api';
import { KeyringPair } from '@polkadot/keyring/types';
import { waitReady } from '@polkadot/wasm-crypto';

import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';

import { ExtrinsicSubmitter } from '../../src/auction/services/extrinsic-submitter';
import * as util from '../../src/utils/blockchain/util';
import { initApp, runMigrations } from '../data';
import { CreateAuctionRequest, PlaceBidRequest } from '../../src/auction/requests';
import { MarketConfig } from '../../src/config/market-config';
import { connect as connectSocket, Socket } from 'socket.io-client';
import { ServerToClientEvents, ClientToServerEvents } from '../../src/broadcast/types';
import {convertAddress} from "../../src/utils/blockchain/util";

type Actor = {
  keyring: KeyringPair;
  kusamaAddress: string;
  uniqueAddress: string;
}

export type AuctionTestEntities = {
  app: INestApplication;
  uniqueApi: ApiPromise;
  kusamaApi: ApiPromise;
  extrinsicSubmitter: ExtrinsicSubmitter;
  clientSocket: Socket<ServerToClientEvents, ClientToServerEvents>;
  actors: {
    seller: Actor;
    buyer: Actor;
    anotherBuyer: Actor;
    market: Actor;
  };
};

export const getAuctionTestEntities = async (): Promise<AuctionTestEntities> => {
  await waitReady();

  const marketSeed = `//Market/${Date.now()}`;
  const market = util.privateKey(marketSeed);
  const seller = util.privateKey(`//Seller/${Date.now()}`);
  const buyer = util.privateKey(`//Buyer/${Date.now()}`);
  const anotherBuyer = util.privateKey(`//AnotherBuyer/${Date.now()}`);

  let extrinsicSubmitterCounter = 0;

  const extrinsicSubmitter = {
    submit() {
      const result = {
        block: { header: { number: extrinsicSubmitterCounter++ } },
      };

      return new Promise((resolve) => {
        setTimeout(() => resolve(result), 1000);
      });
    },
  } as unknown as ExtrinsicSubmitter;

  const configPart: Partial<MarketConfig> = {
    auction: {
      seed: marketSeed,
      commission: 10,
      isMainNode: false,
    },
  };

  const app = await initApp(configPart, (builder) => {
    builder.overrideProvider(ExtrinsicSubmitter).useValue(extrinsicSubmitter);
  });

  const uniqueApi = app.get<ApiPromise>('UNIQUE_API');
  const kusamaApi = app.get<ApiPromise>('KUSAMA_API');

  await runMigrations(app.get('CONFIG'));
  await app.init();

  const { address, port } = app.getHttpServer().listen().address();
  const clientSocket = connectSocket(`http://[${address}]:${port}`, { transports: ['polling'] });

  await new Promise<void>((resolve) => {
    clientSocket.once('connect', () => resolve());
  });

  return {
    app,
    uniqueApi,
    kusamaApi,
    extrinsicSubmitter,
    clientSocket,
    actors: {
      market: {
        keyring: market,
        kusamaAddress: await convertAddress(market.address, kusamaApi.registry.chainSS58),
        uniqueAddress: await convertAddress(market.address, uniqueApi.registry.chainSS58),
      },
      seller: {
        keyring: seller,
        kusamaAddress: await convertAddress(seller.address, kusamaApi.registry.chainSS58),
        uniqueAddress: await convertAddress(seller.address, uniqueApi.registry.chainSS58),
      },
      buyer: {
        keyring: buyer,
        kusamaAddress: await convertAddress(buyer.address, kusamaApi.registry.chainSS58),
        uniqueAddress: await convertAddress(buyer.address, uniqueApi.registry.chainSS58),
      },
      anotherBuyer: {
        keyring: anotherBuyer,
        kusamaAddress: await convertAddress(anotherBuyer.address, kusamaApi.registry.chainSS58),
        uniqueAddress: await convertAddress(anotherBuyer.address, uniqueApi.registry.chainSS58),
      },
    },
  };
};

export const createAuction = async (
  testEntities: AuctionTestEntities,
  collectionId: number,
  tokenId: number,
  auction: Partial<CreateAuctionRequest> = {},
): Promise<request.Test> => {
  const {
    app,
    uniqueApi,
    actors: { market, seller },
  } = testEntities;

  const marketAddress = util.normalizeAccountId({ Substrate: market.uniqueAddress });

  const signedExtrinsic = await uniqueApi.tx.unique.transfer(marketAddress, collectionId, tokenId, 1).signAsync(seller.keyring);

  return request(app.getHttpServer())
    .post('/auction/create_auction')
    .send({
      startPrice: '1000',
      priceStep: '10',
      days: 7,
      ...auction,
      tx: signedExtrinsic.toJSON(),
    } as CreateAuctionRequest);
};

export const placeBid = async (
  testEntities: AuctionTestEntities,
  collectionId, tokenId, amount = '100',
  signer?: KeyringPair,
  ): Promise<request.Test> => {
  const {
    app,
    kusamaApi,
    actors: { market, buyer },
  } = testEntities;

  const signedExtrinsic = await kusamaApi.tx.balances.transfer(market.kusamaAddress, amount).signAsync(signer || buyer.keyring);

  return request(app.getHttpServer())
    .post('/auction/place_bid')
    .send({
      collectionId,
      tokenId,
      tx: signedExtrinsic.toJSON(),
    } as PlaceBidRequest);
};
