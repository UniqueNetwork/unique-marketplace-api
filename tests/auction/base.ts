import { ApiPromise } from "@polkadot/api";
import { KeyringPair } from "@polkadot/keyring/types";
import { waitReady } from "@polkadot/wasm-crypto";

import * as request from "supertest";
import { INestApplication } from "@nestjs/common";

import { ExtrinsicSubmitter } from "../../src/auction/services/extrinsic-submitter";
import * as util from "../../src/utils/blockchain/util";
import { initApp, prepareSearchData, runMigrations } from "../data";
import { CreateAuctionRequest, PlaceBidRequest } from "../../src/auction/requests";


export type AuctionTestEntities = {
  app: INestApplication;
  uniqueApi: ApiPromise;
  kusamaApi: ApiPromise;
  extrinsicSubmitter: ExtrinsicSubmitter;
  actors: {
    seller: KeyringPair;
    buyer: KeyringPair;
    market: KeyringPair;
  },
};

export const getAuctionTestEntities = async (): Promise<AuctionTestEntities> => {
  await waitReady();

  const market = util.privateKey(`//Market/${Date.now()}`);
  const seller = util.privateKey(`//Seller/${Date.now()}`);
  const buyer = util.privateKey(`//Buyer/${Date.now()}`);

  const extrinsicSubmitter = {
    submit: jest.fn().mockResolvedValue({
      block: { header: { number: 1 } },
    }),
  } as unknown as ExtrinsicSubmitter;

  const app = await initApp(undefined, (builder) => {
    builder.overrideProvider(ExtrinsicSubmitter).useValue(extrinsicSubmitter)
  });

  const uniqueApi = app.get<ApiPromise>('UniqueApi');
  const kusamaApi = app.get<ApiPromise>('KusamaApi');

  await runMigrations(app.get('CONFIG'));
  await app.init();
  await prepareSearchData(app.get('DATABASE_CONNECTION').createQueryBuilder());

  return {
    app,
    uniqueApi,
    kusamaApi,
    extrinsicSubmitter,
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
