import { AuctionTestEntities, calculate, getAuctionTestEntities, placeBid, withdrawBid, fetchOffer } from './base';

import { Connection } from 'typeorm';
import { AuctionEntity, BidEntity, BlockchainBlock, ContractAsk } from '../../src/entity';
import { ASK_STATUS } from '../../src/escrow/constants';

import { v4 as uuid } from 'uuid';
import { AuctionStatus, Bid, BidStatus } from '../../src/auction/types';
import { DateHelper } from '../../src/utils/date-helper';

describe('Bid placing method', () => {
  const collectionId = '222';
  const tokenId = '333';

  let testEntities: AuctionTestEntities;

  beforeAll(async () => {
    testEntities = await getAuctionTestEntities();

    const connection = testEntities.app.get<Connection>('DATABASE_CONNECTION');
    const contractAsksRepository = connection.getRepository(ContractAsk);
    const auctionsRepository = connection.getRepository(AuctionEntity);
    const bidsRepository = connection.getRepository(BidEntity);
    const blocksRepository = connection.getRepository(BlockchainBlock);

    const offerId = uuid();
    const auctionId = uuid();
    const blockNumber = Date.now().toString();
    const blockNetwork = 'testnet';

    await blocksRepository.save({
      created_at: new Date(),
      block_number: blockNumber,
      network: blockNetwork,
    });

    await contractAsksRepository.save({
      id: offerId,
      created_at: new Date(),
      status: ASK_STATUS.ACTIVE,
      collection_id: collectionId,
      token_id: tokenId,
      network: blockNetwork,
      block_number_ask: blockNumber,
      price: '110',
      currency: '2',
      address_from: testEntities.actors.seller.uniqueAddress,
      address_to: testEntities.actors.market.uniqueAddress,
      block_number_cancel: null,
      block_number_buy: null,
    });

    await auctionsRepository.save({
      id: auctionId,
      contractAskId: offerId,
      startPrice: '100',
      priceStep: '10',
      status: AuctionStatus.active,
      stopAt: DateHelper.addDays(20),
    });

    await bidsRepository.save([
      {
        auctionId,
        amount: '110',
        balance: '110',
        bidderAddress: testEntities.actors.seller.kusamaAddress,
        status: BidStatus.finished,
      },
      {
        auctionId,
        amount: '100',
        balance: '100',
        bidderAddress: testEntities.actors.buyer.kusamaAddress,
        status: BidStatus.finished,
      },
    ] as Bid[]);

    await testEntities.addSearchIndexRecord(collectionId, tokenId);
  });

  afterAll(async () => {
    await testEntities.app.close();
  });

  it('fetching multiple bids', async () => {
    const offer = await fetchOffer(testEntities, collectionId, tokenId);

    expect(offer).toBeDefined();
    expect(offer.auction).toBeDefined();
    expect(offer.auction.bids).toBeDefined();
    expect(offer.auction.bids.length).toBe(2);
  }, 30_000);

  it('bid placing', async () => {
    const { buyer, anotherBuyer } = testEntities.actors;

    let offer = await fetchOffer(testEntities, collectionId, tokenId);

    let calculationResponse = await calculate(testEntities, collectionId, tokenId, buyer.kusamaAddress);
    expect(calculationResponse.body).toMatchObject({ minBidderAmount: '120' });

    let amount: bigint;

    let withdrawBidResponse = await withdrawBid(testEntities, collectionId, tokenId, buyer.keyring, buyer.kusamaAddress);
    expect(withdrawBidResponse.status).toEqual(200);

    withdrawBidResponse = await withdrawBid(testEntities, collectionId, tokenId, buyer.keyring, buyer.kusamaAddress);
    expect(withdrawBidResponse.status).toEqual(400);

    calculationResponse = await calculate(testEntities, collectionId, tokenId, buyer.kusamaAddress);
    expect(calculationResponse.body).toMatchObject({ minBidderAmount: '120' });

    calculationResponse = await calculate(testEntities, collectionId, tokenId, anotherBuyer.kusamaAddress);
    expect(calculationResponse.body).toMatchObject({ minBidderAmount: '120' });

    amount = BigInt(calculationResponse.body.minBidderAmount) - 1n;
    let placedBidResponse = await placeBid(testEntities, collectionId, tokenId, amount.toString(), anotherBuyer.keyring);
    expect(placedBidResponse.status).toEqual(400);

    amount = BigInt(offer.price) + BigInt(offer.auction.priceStep);
    placedBidResponse = await placeBid(testEntities, collectionId, tokenId, amount.toString(), anotherBuyer.keyring);
    expect(placedBidResponse.status).toEqual(201);

    calculationResponse = await calculate(testEntities, collectionId, tokenId, anotherBuyer.kusamaAddress);
    expect(calculationResponse.body).toMatchObject({ minBidderAmount: '0' });

    amount = BigInt(offer.auction.priceStep);
    placedBidResponse = await placeBid(testEntities, collectionId, tokenId, amount.toString(), anotherBuyer.keyring);
    expect(placedBidResponse.status).toEqual(201);

    placedBidResponse = await placeBid(testEntities, collectionId, tokenId, '30', buyer.keyring);
    expect(placedBidResponse.status).toEqual(400);

    placedBidResponse = await placeBid(testEntities, collectionId, tokenId, '200', buyer.keyring);
    expect(placedBidResponse.status).toEqual(201);

    placedBidResponse = await placeBid(testEntities, collectionId, tokenId, '10', anotherBuyer.keyring);
    expect(placedBidResponse.status).toEqual(400);

    placedBidResponse = await placeBid(testEntities, collectionId, tokenId, '80', anotherBuyer.keyring);
    expect(placedBidResponse.status).toEqual(201);

    offer = await fetchOffer(testEntities, collectionId, tokenId);
    expect(offer.price).toEqual('210'.toString());
  }, 30_000);
});
