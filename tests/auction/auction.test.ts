import { INestApplication } from "@nestjs/common";
import * as request from 'supertest';

import { ApiPromise } from "@polkadot/api";
import { waitReady } from '@polkadot/wasm-crypto';
import { KeyringPair } from "@polkadot/keyring/types";

import { initApp, prepareSearchData, runMigrations } from "../data";
import { ExtrinsicSubmitter } from "../../src/auction/services/extrinsic-submitter";
import { CreateAuctionRequest } from "../../src/auction/requests";
import * as util from "../../src/utils/blockchain/util";

describe('Auction creation method', () => {
  let app: INestApplication;
  let uniqueApi: ApiPromise;

  let seller: KeyringPair;
  let buyer: KeyringPair;
  let market: KeyringPair;

  const extrinsicSubmitterMock = {
    submit: jest.fn().mockResolvedValue({
      block: { header: { number: 1 } }
    })
  };

  beforeAll(async () => {
    await waitReady();

    seller = util.privateKey(`//Seller/${Date.now()}`);
    buyer = util.privateKey(`//Buyer/${Date.now()}`);
    market = util.privateKey(`//Market/${Date.now()}`);

    app = await initApp(undefined, (builder) => {
      builder.overrideProvider(ExtrinsicSubmitter).useValue(extrinsicSubmitterMock)
    });

    uniqueApi = app.get<ApiPromise>('UniqueApi');

    await runMigrations(app.get('CONFIG'));
    await app.init();
    await prepareSearchData(app.get('DATABASE_CONNECTION').createQueryBuilder());
  });

  afterAll(async () => {
    await app.close();
  });

  it('successful auction creation', async () => {
    const collectionId = '11';
    const tokenId = '22';

    const marketAddress = util.normalizeAccountId({ Substrate: market.address });

    const signedExtrinsic = await uniqueApi.tx
      .unique
      .transfer(marketAddress, collectionId, tokenId, 1)
      .signAsync(seller);

    const response = await request(app.getHttpServer())
      .post('/auction/create_auction')
      .send({
        startPrice: '100',
        priceStep: '10',
        days: 7,
        tx: signedExtrinsic.toJSON(),
      } as CreateAuctionRequest)
      .expect(201);

    expect(response.body).toEqual({
        auction: {
          priceStep: "10",
          startPrice: "100",
          status: "created",
          stopAt: expect.any(String),
        },
        collectionId: 11,
        tokenId: 22,
        price: "100",
        quoteId: 0,
        seller: seller.address,
      }
    );
  });

  it('bad request - unsigned tx', async () => {
    const collectionId = '11';
    const tokenId = '22';

    const marketAddress = util.normalizeAccountId({ Substrate: market.address });

    const signedExtrinsic = await uniqueApi.tx
      .unique
      .transfer(marketAddress, collectionId, tokenId, 1)

    const response = await request(app.getHttpServer())
      .post('/auction/create_auction')
      .send({
        startPrice: '100',
        priceStep: '10',
        days: 7,
        tx: signedExtrinsic.toJSON(),
      } as CreateAuctionRequest)
      .expect(400);

    expect(response.text).toContain('tx must be signed');
  });
})
