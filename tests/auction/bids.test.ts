import * as request from 'supertest';

import { AuctionTestEntities, getAuctionTestEntities, placeBid } from './base';

import { Connection } from 'typeorm';
import {AuctionEntity, BidEntity, BlockchainBlock, ContractAsk} from '../../src/entity';
import { ASK_STATUS } from '../../src/escrow/constants';

import { v4 as uuid } from 'uuid';
import { AuctionStatus, BidStatus } from '../../src/auction/types';
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
      price: '140',
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
        amount: '20',
        bidderAddress: testEntities.actors.buyer.kusamaAddress,
        status: BidStatus.finished,
      },
      {
        auctionId,
        amount: '130',
        bidderAddress: testEntities.actors.market.kusamaAddress,
        status: BidStatus.finished,
      },
      {
        auctionId,
        amount: '20',
        bidderAddress: testEntities.actors.buyer.kusamaAddress,
        status: BidStatus.finished,
      },
      {
        auctionId,
        amount: '110',
        bidderAddress: testEntities.actors.seller.kusamaAddress,
        status: BidStatus.finished,
      },
      {
        auctionId,
        amount: '100',
        bidderAddress: testEntities.actors.buyer.kusamaAddress,
        status: BidStatus.finished,
      },
    ]);
  });

  afterAll(async () => {
    await testEntities.app.close();
  });

  it('fetching multiple bids', async () => {
    const offerByCollectionAndToken = await request(testEntities.app.getHttpServer()).get(`/offer/${collectionId}/${tokenId}`);

    expect(offerByCollectionAndToken.body).toBeDefined();
    expect(offerByCollectionAndToken.body).toEqual({});
    expect(offerByCollectionAndToken.body.auction).toBeDefined();
    expect(offerByCollectionAndToken.body.auction.bids).toBeDefined();
    expect(offerByCollectionAndToken.body.auction.bids.length).toBe(3);
  }, 30_000);

  it('bid placing', async () => {
    const getCurrentOffer = async (): Promise<OfferContractAskDto> => {
      return request(testEntities.app.getHttpServer())
        .get(`/offer/${collectionId}/${tokenId}`)
        .then((response) => response.body as OfferContractAskDto);
    };

    let offer = await getCurrentOffer();

    const { buyer, anotherBuyer } = testEntities.actors;
    const amount = new BN(offer.price).sub(new BN('100')).sub(new BN('1')).toString();

    let placedBidResponse = await placeBid(testEntities, collectionId, tokenId, amount, buyer.keyring);
    expect(placedBidResponse.status).toEqual(400);

    placedBidResponse = await placeBid(testEntities, collectionId, tokenId, offer.price, buyer.keyring);
    expect(placedBidResponse.status).toEqual(201);

    offer = await getCurrentOffer();

    placedBidResponse = await placeBid(testEntities, collectionId, tokenId, offer.price, anotherBuyer.keyring);
    expect(placedBidResponse.status).toEqual(400);

    const anotherBuyerPrice = new BN(offer.price).add(new BN(offer.auction.priceStep)).toString();
    placedBidResponse = await placeBid(testEntities, collectionId, tokenId, anotherBuyerPrice, anotherBuyer.keyring);
    console.log(placedBidResponse.body);
    expect(placedBidResponse.status).toEqual(201);

    offer = await getCurrentOffer();

    expect(offer.price).toEqual(anotherBuyerPrice);
  }, 30_000);
});
