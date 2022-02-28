import * as request from 'supertest';

import { AuctionTestEntities, getAuctionTestEntities, placeBid } from './base';

import { Connection } from 'typeorm';
import { AuctionEntity, BidEntity, BlockchainBlock, ContractAsk } from '../../src/entity';
import { ASK_STATUS } from '../../src/escrow/constants';

import { v4 as uuid } from 'uuid';
import { AuctionStatus, Bid, BidStatus } from '../../src/auction/types';
import { DateHelper } from '../../src/utils/date-helper';
import { OfferContractAskDto } from '../../src/offers/dto/offer-dto';

type BidsInfo = Record<string, { amount: bigint; calculatedPrice: bigint; }>

const getBidsInfo = (offer: OfferContractAskDto): BidsInfo => {
  return offer.auction.bids.reduce((acc, bid) => {
    const current = acc[bid.bidderAddress] || { amount: 0n, calculatedPrice: BigInt(offer.price) };
    current.amount += BigInt(bid.amount);
    current.calculatedPrice = BigInt(offer.price) - current.amount + BigInt(offer.auction.priceStep);

    acc[bid.bidderAddress] = current;

    return acc;
  }, {} as BidsInfo)
}

describe('Bid placing method', () => {
  const collectionId = '222';
  const tokenId = '333';

  let testEntities: AuctionTestEntities;
  let fetchOffer: () => Promise<OfferContractAskDto>;

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
        balance: '140',
        bidderAddress: testEntities.actors.buyer.kusamaAddress,
        status: BidStatus.minting,
      },
      {
        auctionId,
        amount: '130',
        balance: '130',
        bidderAddress: testEntities.actors.market.kusamaAddress,
        status: BidStatus.finished,
      },
      {
        auctionId,
        amount: '20',
        balance: '120',
        bidderAddress: testEntities.actors.buyer.kusamaAddress,
        status: BidStatus.finished,
      },
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

    fetchOffer = async () => {
      return request(testEntities.app.getHttpServer())
        .get(`/offer/${collectionId}/${tokenId}`)
        .then((response) => response.body as OfferContractAskDto);
    };
  });

  afterAll(async () => {
    await testEntities.app.close();
  });

  it('fetching multiple bids', async () => {
    const offer = await fetchOffer();

    expect(offer).toBeDefined();
    expect(offer.auction).toBeDefined();
    expect(offer.auction.bids).toBeDefined();
    expect(offer.auction.bids.length).toBe(5);
  }, 30_000);

  it('bid placing', async () => {
    let offer = await fetchOffer();

    const { buyer, anotherBuyer } = testEntities.actors;

    let bidsInfo: BidsInfo;
    let amount = BigInt(offer.price);

    let placedBidResponse = await placeBid(testEntities, collectionId, tokenId, amount.toString(), anotherBuyer.keyring);
    expect(placedBidResponse.body.message).toMatch(/but current price is/);
    expect(placedBidResponse.status).toEqual(400);

    amount = BigInt(offer.price) + BigInt(offer.auction.priceStep);
    placedBidResponse = await placeBid(testEntities, collectionId, tokenId, amount.toString(), anotherBuyer.keyring);
    expect(placedBidResponse.status).toEqual(201);

    offer = await fetchOffer();
    bidsInfo = getBidsInfo(offer);
    amount = bidsInfo[buyer.kusamaAddress].calculatedPrice;

    placedBidResponse = await placeBid(testEntities, collectionId, tokenId, amount.toString(), buyer.keyring);
    expect(placedBidResponse.status).toEqual(201);


    offer = await fetchOffer();
    bidsInfo = getBidsInfo(offer);
    amount = bidsInfo[anotherBuyer.kusamaAddress].amount;

    placedBidResponse = await placeBid(testEntities, collectionId, tokenId, amount.toString(), anotherBuyer.keyring);
    expect(placedBidResponse.status).toEqual(201);

    offer = await fetchOffer();
    expect(offer.price).toEqual((amount * 2n).toString());
  }, 30_000);
});
