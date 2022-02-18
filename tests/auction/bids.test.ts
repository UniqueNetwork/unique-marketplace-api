import * as request from 'supertest';

import { AuctionTestEntities, getAuctionTestEntities, placeBid } from './base';

import { Connection } from 'typeorm';
import { BlockchainBlock, ContractAsk } from '../../src/entity';
import { ASK_STATUS } from '../../src/escrow/constants';

import { v4 as uuid } from 'uuid';
import { AuctionStatus, BidStatus } from '../../src/auction/types';
import { DateHelper } from '../../src/utils/date-helper';
import { OfferContractAskDto } from '../../src/offers/dto/offer-dto';
import { BN } from '@polkadot/util';

describe('Bid placing method', () => {
  const collectionId = '222';
  const tokenId = '333';

  let testEntities: AuctionTestEntities;

  beforeAll(async () => {
    testEntities = await getAuctionTestEntities();

    const connection = testEntities.app.get<Connection>('DATABASE_CONNECTION');
    const contractAskRepository = connection.getRepository(ContractAsk);
    const blocksRepository = connection.getRepository(BlockchainBlock);

    const offerId = uuid();
    const blockNumber = Date.now().toString();
    const blockNetwork = 'testnet';

    const block = blocksRepository.create({
      created_at: new Date(),
      block_number: blockNumber,
      network: blockNetwork,
    });

    const contract = contractAskRepository.create({
      id: offerId,
      status: ASK_STATUS.ACTIVE,
      collection_id: collectionId,
      token_id: tokenId,
      network: blockNetwork,
      block_number_ask: blockNumber,
      price: '300',
      currency: '2',
      address_from: testEntities.actors.seller.uniqueAddress,
      address_to: testEntities.actors.market.uniqueAddress,
      block_number_cancel: null,
      block_number_buy: null,
      auction: {
        contractAskId: offerId,
        startPrice: '100',
        priceStep: '10',
        status: AuctionStatus.active,
        stopAt: DateHelper.addDays(20),
        bids: [
          {
            amount: '200',
            pendingAmount: '200',
            isWithdrawn: false,
            bidderAddress: testEntities.actors.market.kusamaAddress,
            status: BidStatus.created,
          },
          {
            amount: '150',
            pendingAmount: '300',
            isWithdrawn: false,
            bidderAddress: testEntities.actors.seller.kusamaAddress,
            status: BidStatus.created,
          },
          {
            amount: '100',
            pendingAmount: '100',
            isWithdrawn: false,
            bidderAddress: testEntities.actors.buyer.kusamaAddress,
            status: BidStatus.created,
          },
        ],
      },
    });

    await blocksRepository.save(block);
    await contractAskRepository.save(contract);
  });

  afterAll(async () => {
    await testEntities.app.close();
  });

  it('fetching multiple bids', async () => {
    const offerByCollectionAndToken = await request(testEntities.app.getHttpServer()).get(`/offer/${collectionId}/${tokenId}`);

    expect(offerByCollectionAndToken.body).toBeDefined();
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
