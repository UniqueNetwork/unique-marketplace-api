import request from 'supertest';

import { AuctionTestEntities, getAuctionTestEntities } from './base';
import { AuctionCreationService } from '../../src/auction/services/auction-creation.service';
import { ApiPromise } from '@polkadot/api';
import { subToEth } from '../../src/utils/blockchain/web3';

describe('Auction validation', () => {
  let testEntities: AuctionTestEntities;

  beforeAll(async () => {
    testEntities = await getAuctionTestEntities();
  });

  afterAll(async () => {
    await testEntities.app.close();
  });

  it('successful auction creation', async () => {
    const { market, seller } = testEntities.actors;

    const uniqueApi = testEntities.app.get<ApiPromise>('UNIQUE_API');
    const auctionCreationService = testEntities.app.get(AuctionCreationService);
    auctionCreationService.create = jest.fn();

    const transferFromSubstrateTx = await uniqueApi.tx.unique
      .transfer({ Substrate: market.uniqueAddress }, '1', '1', 1)
      .signAsync(seller.keyring);

    const transferFromSubstrate = await request(testEntities.app.getHttpServer()).post('/auction/create_auction').send({
      tokenOwner: seller.keyring.address,
      startPrice: '1000',
      priceStep: '10',
      days: 7,
      tx: transferFromSubstrateTx.toJSON(),
    });

    const transferFromEthereumTx = await uniqueApi.tx.unique
      .transferFrom({ Ethereum: subToEth(seller.uniqueAddress) }, { Substrate: market.uniqueAddress }, '1', '1', 1)
      .signAsync(seller.keyring);

    const transferFromEthereum = await request(testEntities.app.getHttpServer()).post('/auction/create_auction').send({
      tokenOwner: seller.keyring.address,
      startPrice: '1000',
      priceStep: '10',
      days: 7,
      tx: transferFromEthereumTx.toJSON(),
    });

    expect(transferFromSubstrate.status).toEqual(201);
    expect(transferFromEthereum.status).toEqual(201);

    expect(auctionCreationService.create).toHaveBeenCalledTimes(2);
  });
});
