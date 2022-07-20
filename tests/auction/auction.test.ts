import request from 'supertest';

import * as util from '../../src/utils/blockchain/util';
import { OfferContractAskDto } from '../../src/offers/dto/offer-dto';
import { AuctionTestEntities, createAuction, getAuctionTestEntities, placeBid, getEventHook } from './base';
import { Bid } from '../../src/types';
import { encodeAddress } from '@polkadot/util-crypto';

describe('Auction creation method', () => {
  const collectionId = 11;
  const tokenId = 22;

  let testEntities: AuctionTestEntities;

  beforeAll(async () => {
    testEntities = await getAuctionTestEntities();
    await testEntities.addSearchIndexRecord(collectionId, tokenId);
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
      const bidPlacedItems = socketEvents.filter((item) => item[0] === 'bidPlaced');

      if (bidPlacedItems.length === 2) {
        clientReceivedBid();
      }
    });

    const createAuctionResponse = await createAuction(testEntities, collectionId, tokenId, {
      startPrice: '1000',
      priceStep: '100',
    });

    expect(createAuctionResponse.status).toEqual(201);

    await untilClientSubscribed;

    const auctionOffer = createAuctionResponse.body as OfferContractAskDto;

    expect(auctionOffer).toMatchObject({
      collectionId,
      tokenId,
      seller: encodeAddress(testEntities.actors.seller.uniqueAddress),
    });

    const placedBidBadResponse = await placeBid(testEntities, collectionId, tokenId, '999');
    expect(placedBidBadResponse.status).toEqual(400);

    let placedBidResponse = await placeBid(testEntities, collectionId, tokenId, auctionOffer.price);
    expect(placedBidResponse.status).toEqual(201);

    placedBidResponse = await placeBid(testEntities, collectionId, tokenId, '299');
    expect(placedBidResponse.status).toEqual(201);

    const offerWithBids = placedBidResponse.body as OfferContractAskDto;

    expect(offerWithBids.auction.bids).toEqual([
      {
        bidderAddress: encodeAddress(testEntities.actors.buyer.kusamaAddress),
        amount: '299',
        balance: '1299',
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      },
      {
        bidderAddress: encodeAddress(testEntities.actors.buyer.kusamaAddress),
        amount: '1000',
        balance: '1000',
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      },
    ] as Bid[]);

    const auctionCreatedEvent = socketEvents[0];
    expect(auctionCreatedEvent).toBeDefined();
    expect(auctionCreatedEvent[0]).toEqual('auctionStarted');
    expect(auctionCreatedEvent[1]).toEqual(auctionOffer);

    // todo - check missing "bidPlaced" events on client socket
    await untilClientReceivedBid;
    const firstBidEvent = socketEvents[1];
    const secondBidEvent = socketEvents[2];

    expect(firstBidEvent).toBeDefined();
    expect(firstBidEvent[0]).toEqual('bidPlaced');
    expect(firstBidEvent[1].price).toEqual('1000');
    expect(firstBidEvent[1].auction.bids.length).toEqual(1);

    expect(secondBidEvent).toBeDefined();
    expect(secondBidEvent[0]).toEqual('bidPlaced');
    expect(secondBidEvent[1].price).toEqual('1299');
    expect(secondBidEvent[1].auction.bids.length).toEqual(2);
  });

  it('bad request - unsigned tx', async () => {
    const {
      app,
      uniqueApi,
      actors: { market, seller },
    } = testEntities;

    const marketAddress = util.normalizeAccountId({ Substrate: market.kusamaAddress });

    const unsignedExtrinsic = await uniqueApi.tx.unique.transfer(marketAddress, collectionId, tokenId, 1);

    const response = await request(app.getHttpServer())
      .post('/auction/create_auction')
      .send({
        tokenOwner: seller.keyring.address,
        startPrice: '100',
        priceStep: '10',
        days: 7,
        tx: unsignedExtrinsic.toJSON(),
      })
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
        tokenOwner: seller.keyring.address,
        startPrice: '100',
        priceStep: '10',
        days: 7,
        tx: invalidRecipientExtrinsic.toJSON(),
      })
      .expect(400);

    expect(response.text).toContain('should be market');
    expect(response.text).toContain(market.uniqueAddress);
  });

  it('avoid auction duplication', async () => {
    const duplicatedCollectionId = 11;
    const duplicatedTokenId = 33;

    await testEntities.addSearchIndexRecord(duplicatedCollectionId, duplicatedTokenId);

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
