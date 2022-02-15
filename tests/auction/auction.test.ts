import * as request from 'supertest';

import { CreateAuctionRequest } from "../../src/auction/requests";
import * as util from "../../src/utils/blockchain/util";
import { OfferContractAskDto } from "../../src/offers/dto/offer-dto";
import {
  AuctionTestEntities,
  createAuction,
  getAuctionTestEntities,
  placeBid,
} from "./base";


const getEventHook = (): [Promise<void>, CallableFunction] => {
  let onResolve: CallableFunction = null;

  const wait = new Promise<void>((resolve) => {
    onResolve = resolve;
  });

  return [wait, onResolve];
}

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

    const createAuctionResponse = await createAuction(testEntities, collectionId, tokenId);

    await untilClientSubscribed;

    expect(createAuctionResponse.status).toEqual(201);

    const auctionOffer = createAuctionResponse.body as OfferContractAskDto;

    expect(auctionOffer).toMatchObject({
      collectionId,
      tokenId,
      seller: testEntities.actors.seller.address,
    });

    const placedBidResponse = await placeBid(testEntities, collectionId, tokenId);
    expect(placedBidResponse.status).toEqual(201);

    const offerWithBids = placedBidResponse.body as OfferContractAskDto;

    expect(offerWithBids.auction.bids).toEqual([{
      bidderAddress: testEntities.actors.buyer.address,
      amount: '100',
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    }]);

    const offerByCollectionAndToken = await request(testEntities.app.getHttpServer()).get(`/offer/${collectionId}/${tokenId}`);

    expect(offerByCollectionAndToken.body).toEqual(offerWithBids);

    await untilClientReceivedBid;

    expect(socketEvents).toEqual([
      ['auctionStarted', auctionOffer],
      ['bidPlaced', offerWithBids],
    ]);
  }, 30_000);

  it('bad request - unsigned tx', async () => {
    const { app, uniqueApi, actors: { market } } = testEntities;

    const marketAddress = util.normalizeAccountId({ Substrate: market.address });

    const unsignedExtrinsic = await uniqueApi.tx
      .unique
      .transfer(marketAddress, collectionId, tokenId, 1)

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
    const { app, uniqueApi, actors: { buyer, seller, market } } = testEntities;

    const marketAddress = util.normalizeAccountId({ Substrate: buyer.address });

    const invalidRecipientExtrinsic = await uniqueApi.tx
      .unique
      .transfer(marketAddress, collectionId, tokenId, 1)
      .signAsync(seller);

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
    expect(response.text).toContain(market.address);
  });
})
