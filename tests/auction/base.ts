import { ApiPromise } from "@polkadot/api";
import { KeyringPair } from "@polkadot/keyring/types";
import { waitReady } from "@polkadot/wasm-crypto";

import * as request from "supertest";
import { INestApplication } from "@nestjs/common";

import { ExtrinsicSubmitter } from "../../src/auction/services/extrinsic-submitter";
import * as util from "../../src/utils/blockchain/util";
import { initApp, prepareSearchData, runMigrations } from "../data";
import { CreateAuctionRequest, PlaceBidRequest } from "../../src/auction/requests";
import { MarketConfig } from "../../src/config/market-config";
import { connect as connectSocket, Socket } from "socket.io-client";
import { ServerToClientEvents, ClientToServerEvents } from "../../src/broadcast/types";


export type AuctionTestEntities = {
  app: INestApplication;
  uniqueApi: ApiPromise;
  kusamaApi: ApiPromise;
  extrinsicSubmitter: ExtrinsicSubmitter;
  clientSocket: Socket<ServerToClientEvents, ClientToServerEvents>;
  actors: {
    seller: KeyringPair;
    buyer: KeyringPair;
    market: KeyringPair;
  },
};

export const getAuctionTestEntities = async (): Promise<AuctionTestEntities> => {
  await waitReady();

  const marketSeed = `//Market/${Date.now()}`;
  const market = util.privateKey(marketSeed);
  const seller = util.privateKey(`//Seller/${Date.now()}`);
  const buyer = util.privateKey(`//Buyer/${Date.now()}`);

  const extrinsicSubmitter = {
    submit: jest.fn().mockResolvedValue({
      block: { header: { number: 1 } },
    }),
  } as unknown as ExtrinsicSubmitter;

  const configPart: Partial<MarketConfig> = {
    auction: {
      seed: marketSeed,
      commission: 10,
    },
  };

  const app = await initApp(configPart, (builder) => {
    builder.overrideProvider(ExtrinsicSubmitter).useValue(extrinsicSubmitter)
  });

  const uniqueApi = app.get<ApiPromise>('UNIQUE_API');
  const kusamaApi = app.get<ApiPromise>('KUSAMA_API');

  await runMigrations(app.get('CONFIG'));
  await app.init();
  await prepareSearchData(app.get('DATABASE_CONNECTION').createQueryBuilder());


  const { address, port } = app.getHttpServer().listen().address();
  const clientSocket = connectSocket(`http://[${address}]:${port}`, { transports: ["polling"]} );

  await new Promise<void>((resolve) => {
    clientSocket.once('connect', () => resolve())
  });

  return {
    app,
    uniqueApi,
    kusamaApi,
    extrinsicSubmitter,
    clientSocket,
    actors: {
      market,
      seller,
      buyer,
    }
  }
}

export const createAuction = async (testEntities: AuctionTestEntities, collectionId, tokenId): Promise<request.Test> => {
  const {
    app,
    uniqueApi,
    actors: { market, seller }
  } = testEntities;

  const marketAddress = util.normalizeAccountId({ Substrate: market.address });

  const signedExtrinsic = await uniqueApi.tx
    .unique
    .transfer(marketAddress, collectionId, tokenId, 1)
    .signAsync(seller);

  return request(app.getHttpServer())
    .post('/auction/create_auction')
    .send({
      startPrice: '100',
      priceStep: '10',
      days: 7,
      tx: signedExtrinsic.toJSON(),
    } as CreateAuctionRequest);
}

export const placeBid = async (testEntities: AuctionTestEntities, collectionId, tokenId): Promise<request.Test> => {
  const {
    app,
    kusamaApi,
    actors: { market, buyer }
  } = testEntities;

  const signedExtrinsic = await kusamaApi.tx
    .balances
    .transfer(market.address, '100')
    .signAsync(buyer);

  return request(app.getHttpServer())
    .post('/auction/place_bid')
    .send({
      collectionId,
      tokenId,
      tx: signedExtrinsic.toJSON(),
    } as PlaceBidRequest)
}
