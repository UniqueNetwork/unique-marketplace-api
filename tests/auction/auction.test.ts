import * as request from 'supertest';

import { CreateAuctionRequest } from '../../src/auction/requests';
import * as util from '../../src/utils/blockchain/util';
import { OfferContractAskDto } from '../../src/offers/dto/offer-dto';
import { AuctionTestEntities, createAuction, getAuctionTestEntities, placeBid } from './base';
import { Bid } from "../../src/auction/types";

const getEventHook = (): [Promise<void>, CallableFunction] => {
  let onResolve: CallableFunction = null;

  const wait = new Promise<void>((resolve) => {
    onResolve = resolve;
  });

  return [wait, onResolve];
};

describe('Auction creation method', () => {
  const collectionId = 11;
  const tokenId = 22;

  let testEntities: AuctionTestEntities;

  beforeAll(async () => {
    testEntities = await getAuctionTestEntities();
  });

  afterAll(async () => {
    await testEntities.app.close();
  });

  it('successful auction creation', async () => {
    const socketEvents: [string, any][] = [];

    const [untilClientSubscribed, clientSubscribed] = getEventHook();
    const [untilClientReceivedBid, clientReceivedBid] = getEventHook();

    testEntities.clientSocket.on('auctionStarted', (offer) => {
      socketEvents.push(['auctionStarted', offer]);

      testEntities.clientSocket.emit('subscribeToAuction', offer);

      setTimeout(clientSubscribed, 1000);
    });

    testEntities.clientSocket.on('bidPlaced', (offer) => {
      socketEvents.push(['bidPlaced', offer]);

      clientReceivedBid();
    });

    const createAuctionResponse = await createAuction(testEntities, collectionId, tokenId, { startPrice: '1000', priceStep: '100' });

    expect(createAuctionResponse.status).toEqual(201);

    await untilClientSubscribed;

    const auctionOffer = createAuctionResponse.body as OfferContractAskDto;

    expect(auctionOffer).toMatchObject({
      collectionId,
      tokenId,
      seller: testEntities.actors.seller.uniqueAddress,
    });

    const placedBidBadResponse = await placeBid(testEntities, collectionId, tokenId, '999');
    expect(placedBidBadResponse.status).toEqual(400);

    const placedBidResponse = await placeBid(testEntities, collectionId, tokenId, '1100');
    expect(placedBidResponse.status).toEqual(201);

    const offerWithBids = placedBidResponse.body as OfferContractAskDto;

    expect(offerWithBids.auction.bids).toEqual([
      {
        bidderAddress: testEntities.actors.buyer.kusamaAddress,
        amount: '1100',
        balance: '1100',
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      } as Bid,
    ]);

    const offerByCollectionAndToken = await request(testEntities.app.getHttpServer()).get(`/offer/${collectionId}/${tokenId}`);

    expect(offerByCollectionAndToken.body).toEqual({
      ...offerWithBids,
      auction: {
        ...offerWithBids.auction,
        bids: [
          {
            ...offerWithBids.auction.bids[0],
            amount: expect.any(String),
          },
        ],
      },
      price: '1100',
    });

    await untilClientReceivedBid;

    expect(socketEvents).toEqual([
      ['auctionStarted', auctionOffer],
      ['bidPlaced', offerWithBids],
    ]);
  });

  it('bad request - unsigned tx', async () => {
    const {
      app,
      uniqueApi,
      actors: { market },
    } = testEntities;

    const marketAddress = util.normalizeAccountId({ Substrate: market.kusamaAddress });

    const unsignedExtrinsic = await uniqueApi.tx.unique.transfer(marketAddress, collectionId, tokenId, 1);

    const response = await request(app.getHttpServer())
      .post('/auction/create_auction')
      .send({
        startPrice: '100',
        priceStep: '10',
        days: 7,
        tx: unsignedExtrinsic.toJSON(),
      } as CreateAuctionRequest)
      .expect(400);

    expect(response.text).toContain('tx must be signed');
  });

  it('bad request - wrong tx recipient', async () => {
    const {
      app,
      uniqueApi,
      actors: { buyer, seller, market },
    } = testEntities;

    const buyerAddress = util.normalizeAccountId({ Substrate: buyer.kusamaAddress });

    const invalidRecipientExtrinsic = await uniqueApi.tx.unique.transfer(buyerAddress, collectionId, tokenId, 1).signAsync(seller.keyring);

    const response = await request(app.getHttpServer())
      .post('/auction/create_auction')
      .send({
        startPrice: '100',
        priceStep: '10',
        days: 7,
        tx: invalidRecipientExtrinsic.toJSON(),
      } as CreateAuctionRequest)
      .expect(400);

    expect(response.text).toContain('should be market');
    expect(response.text).toContain(market.uniqueAddress);
  });

  it('avoid auction duplication', async () => {
    const duplicatedCollectionId = 11;
    const duplicatedTokenId = 33;

    const responses = await Promise.all([
      createAuction(testEntities, duplicatedCollectionId, duplicatedTokenId),
      createAuction(testEntities, duplicatedCollectionId, duplicatedTokenId),
      createAuction(testEntities, duplicatedCollectionId, duplicatedTokenId),
      createAuction(testEntities, duplicatedCollectionId, duplicatedTokenId),
    ]);

    const statuses = responses.reduce(
      (acc, { statusCode }) => {
        if (200 <= statusCode && statusCode < 300) {
          acc.successCount = acc.successCount + 1;
        } else {
          acc.failedCount = acc.failedCount + 1;
        }

        return acc;
      },
      { successCount: 0, failedCount: 0 },
    );

    expect(statuses).toEqual({
      successCount: 1,
      failedCount: responses.length - 1,
    });
  });
});
