import { ApiPromise } from '@polkadot/api';
import { KeyringPair } from '@polkadot/keyring/types';
import { waitReady } from '@polkadot/wasm-crypto';

import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';

import { ExtrinsicSubmitter } from '../../src/auction/services/helpers/extrinsic-submitter';
import * as util from '../../src/utils/blockchain/util';
import { convertAddress } from '../../src/utils/blockchain/util';
import { initApp, runMigrations } from '../data';
import { CreateAuctionRequest, PlaceBidRequest } from '../../src/auction/requests';
import { MarketConfig } from '../../src/config/market-config';
import { connect as connectSocket, Socket } from 'socket.io-client';
import { ClientToServerEvents, ServerToClientEvents } from '../../src/broadcast/types';
import { u8aToHex } from '@polkadot/util';
import { OfferContractAskDto} from "../../src/offers/dto/offer-dto";
import { SearchIndex } from "../../src/entity";
import { Connection } from "typeorm";
import { v4 as uuid } from 'uuid';

type Actor = {
  keyring: KeyringPair;
  kusamaAddress: string;
  uniqueAddress: string;
};

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
  addSearchIndexRecord: (collectionId: number | string, tokenId: number | string) => Promise<void>;
};

export const getAuctionTestEntities = async (): Promise<AuctionTestEntities> => {
  await waitReady();

  const marketSeed = `//Market/${Date.now()}`;
  const market = util.privateKey(marketSeed);
  const seller = util.privateKey(`//Seller/${Date.now()}`);
  const buyer = util.privateKey(`//Buyer/${Date.now()}`);
  const anotherBuyer = util.privateKey(`//AnotherBuyer/${Date.now()}`);

  let extrinsicSubmitterCounter = 0n;

  const extrinsicSubmitter = {
    submit: jest.fn().mockImplementation(() => {
      const result = {
        isSucceed: true,
        blockNumber: extrinsicSubmitterCounter++,
      };

      return new Promise((resolve) => {
        setTimeout(() => resolve(result), 1000);
      });
    }),
  } as unknown as ExtrinsicSubmitter;

  const configPart: Partial<MarketConfig> = {
    auction: {
      seed: marketSeed,
      commission: 10,
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

  const addSearchIndexRecord = async (collectionId: number | string, tokenId: number | string): Promise<void> => {
    const connection = app.get<Connection>('DATABASE_CONNECTION');
    const searchIndexRepository = connection.getRepository(SearchIndex);

    await searchIndexRepository.save({
      id: uuid(),
      collection_id: String(collectionId),
      token_id: String(tokenId),
      network: 'quartz',
      locale: 'en',
      value: `${collectionId}/${tokenId}`,
      is_trait: false,
    });
  }

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
    addSearchIndexRecord,
  };
};

export const createAuction = async (
  testEntities: AuctionTestEntities,
  collectionId: number,
  tokenId: number,
  auction: Partial<CreateAuctionRequest> | any = {},
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
      tokenOwner: seller.keyring.address,
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

  const signedExtrinsic = await kusamaApi.tx.balances.transferKeepAlive(market.kusamaAddress, amount).signAsync(signer || buyer.keyring);

  return request(app.getHttpServer())
    .post('/auction/place_bid')
    .send({
      collectionId,
      tokenId,
      tx: signedExtrinsic.toJSON(),
    } as PlaceBidRequest);
};

export const withdrawBid = async (
  testEntities: AuctionTestEntities,
  collectionId: string,
  tokenId: string,
  signer: KeyringPair,
  address?: string,
): Promise<request.Test> => {
  const query = `collectionId=${collectionId}&tokenId=${tokenId}&timestamp=${Date.now()}`;
  const signature = signer.sign(query);

  const authorization = `${address || signer.address}:${u8aToHex(signature)}`;

  return request(testEntities.app.getHttpServer())
    .delete(`/auction/withdraw_bid?${query}`)
    .set({ 'Authorization': authorization })
    .send();
};

export const calculate = async (
  testEntities: AuctionTestEntities,
  collectionId: string,
  tokenId: string,
  bidderAddress?: string,
): Promise<request.Test> => {
  return request(testEntities.app.getHttpServer()).post(`/auction/calculate`).send({
    collectionId,
    tokenId,
    bidderAddress,
  });
};

export const fetchOffer = (
  testEntities: AuctionTestEntities,
  collectionId: string,
  tokenId: string,
): Promise<OfferContractAskDto> => {
  return request(testEntities.app.getHttpServer())
    .get(`/offer/${collectionId}/${tokenId}`)
    .then((response) => response.body as OfferContractAskDto);
};

export const getEventHook = (): [Promise<void>, CallableFunction] => {
  let onResolve: CallableFunction = null;

  const wait = new Promise<void>((resolve) => {
    onResolve = resolve;
  });

  return [wait, onResolve];
};
