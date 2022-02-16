import * as request from 'supertest';

import { AuctionTestEntities, getAuctionTestEntities } from './base';

import { Connection } from 'typeorm';
import { BlockchainBlock, ContractAsk } from '../../src/entity';
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
      price: '200',
      currency: '2',
      address_from: testEntities.actors.seller.address,
      address_to: testEntities.actors.seller.address,
      block_number_cancel: null,
      block_number_buy: null,
      auction: {
        contractAskId: offerId,
        startPrice: '1000',
        priceStep: '100',
        status: AuctionStatus.active,
        stopAt: DateHelper.addDays(20),
        bids: [
          {
            amount: '200',
            pendingAmount: '200',
            isWithdrawn: false,
            bidderAddress: testEntities.actors.market.address,
            status: BidStatus.created,
          },
          {
            amount: '150',
            pendingAmount: '300',
            isWithdrawn: false,
            bidderAddress: testEntities.actors.seller.address,
            status: BidStatus.created,
          },
          {
            amount: '100',
            pendingAmount: '100',
            isWithdrawn: false,
            bidderAddress: testEntities.actors.buyer.address,
            status: BidStatus.created,
          },
        ],
      }
    })

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
});
