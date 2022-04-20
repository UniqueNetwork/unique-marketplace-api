import { AuctionTestEntities, getAuctionTestEntities } from './base';

import { Connection, Repository } from 'typeorm';
import { AuctionEntity, BidEntity, BlockchainBlock, ContractAsk } from '../../src/entity';
import { ASK_STATUS } from '../../src/escrow/constants';

import { v4 as uuid } from 'uuid';
import { AuctionStatus, Bid, BidStatus } from '../../src/auction/types';
import { AuctionClosingService } from '../../src/auction/services/closing/auction-closing.service';
import { SubmittableExtrinsic } from '@polkadot/api/types';
import { TxDecoder } from '../../src/auction/services/helpers/tx-decoder';
import * as request from 'supertest';
import { DateHelper } from '../../src/utils/date-helper';
import { BroadcastService } from "../../src/broadcast/services/broadcast.service";
import { encodeAddress } from '@polkadot/util-crypto';

describe('Auction closing', () => {
  const collectionId = '223';
  const tokenId = '334';

  let testEntities: AuctionTestEntities;
  let tryParseTx: (tx: SubmittableExtrinsic<any>) => Record<string, any>;
  let contractAsksRepository: Repository<ContractAsk>;
  let auctionsRepository: Repository<AuctionEntity>;
  let bidsRepository: Repository<BidEntity>;
  let blocksRepository: Repository<BlockchainBlock>;

  beforeAll(async () => {
    testEntities = await getAuctionTestEntities();

    const txDecoder = testEntities.app.get(TxDecoder);
    tryParseTx = (tx) => {
      try {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        return txDecoder.decodeTx(testEntities.kusamaApi, tx.toHex());
      } catch (error) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        return txDecoder.decodeTx(testEntities.uniqueApi, tx.toHex());
      }
    };

    const connection = testEntities.app.get<Connection>('DATABASE_CONNECTION');
    contractAsksRepository = connection.getRepository(ContractAsk);
    auctionsRepository = connection.getRepository(AuctionEntity);
    bidsRepository = connection.getRepository(BidEntity);
    blocksRepository = connection.getRepository(BlockchainBlock);

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
      price: '120',
      currency: '2',
      address_from: testEntities.actors.seller.uniqueAddress,
      address_to: testEntities.actors.market.uniqueAddress,
      block_number_cancel: null,
      block_number_buy: null,
    });

    await auctionsRepository.save({
      id: auctionId,
      contractAskId: offerId,
      startPrice: '10',
      priceStep: '10',
      status: AuctionStatus.created,
      stopAt: DateHelper.addDays(2),
    });

    await bidsRepository.save([
      {
        auctionId,
        amount: '20',
        balance: '120',
        bidderAddress: testEntities.actors.buyer.kusamaAddress,
        status: BidStatus.finished,
      },
      {
        auctionId,
        amount: '20',
        balance: '120',
        bidderAddress: testEntities.actors.buyer.kusamaAddress,
        status: BidStatus.error,
      },
      {
        auctionId,
        amount: '100',
        balance: '110',
        bidderAddress: testEntities.actors.anotherBuyer.kusamaAddress,
        status: BidStatus.finished,
      },
      {
        auctionId,
        amount: '-30',
        balance: '0',
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
      {
        auctionId,
        amount: '30',
        balance: '30',
        bidderAddress: testEntities.actors.seller.kusamaAddress,
        status: BidStatus.finished,
      },
      {
        auctionId,
        amount: '10',
        balance: '10',
        bidderAddress: testEntities.actors.anotherBuyer.kusamaAddress,
        status: BidStatus.finished,
      },
    ] as Bid[]);
  });

  afterAll(async () => {
    await testEntities.app.close();
  });

  it('closes auction', async () => {
    const { seller, market, buyer, anotherBuyer } = testEntities.actors;
    const auctionClosingService = testEntities.app.get(AuctionClosingService);
    const broadcastService = testEntities.app.get(BroadcastService);
    broadcastService.sendAuctionStopped = jest.fn();
    broadcastService.sendAuctionClosed = jest.fn();

    const connection = testEntities.app.get<Connection>('DATABASE_CONNECTION');
    const activeAuction = await connection.manager.findOne(AuctionEntity);

    await request(testEntities.app.getHttpServer())
      .delete(`/auction/force_close_auction_for_test?collectionId=${collectionId}&tokenId=${tokenId}`)
      .send();

    await new Promise((resolve) => setTimeout(resolve, 1000));

    await auctionClosingService.auctionsStoppingIntervalHandler();
    await expect(auctionClosingService.auctionsStoppingIntervalHandler()).resolves.not.toThrowError();

    expect(broadcastService.sendAuctionStopped).toHaveBeenCalledTimes(1);

    const stoppedAuction = await connection.manager.findOne(AuctionEntity);
    expect(stoppedAuction).toEqual({ ...activeAuction, status: AuctionStatus.stopped, stopAt: expect.any(Date) });

    await auctionClosingService.auctionsWithdrawingIntervalHandler();

    const endedAuction = await connection.manager.findOne(AuctionEntity);
    expect(endedAuction).toEqual({ ...stoppedAuction, status: AuctionStatus.ended });

    expect(broadcastService.sendAuctionClosed).toHaveBeenCalledTimes(1);

    expect(testEntities.extrinsicSubmitter.submit).toHaveBeenCalledTimes(3);
    const lastBid = await connection.manager.findOne(BidEntity, { order: { createdAt: 'DESC' } });
    expect(lastBid).toMatchObject({
      bidderAddress: encodeAddress(anotherBuyer.kusamaAddress),
      amount: '-110',
    } as Partial<BidEntity>);

    const submittedExtrinsics = (testEntities.extrinsicSubmitter.submit as jest.Mock).mock.calls.map((args) => tryParseTx(args[1]));

    expect(submittedExtrinsics).toEqual([
      {
        args: {
          dest: {
            id: anotherBuyer.kusamaAddress,
          },
          value: '110',
        },
        isSigned: true,
        method: 'transferKeepAlive',
        section: 'balances',
        signerAddress: market.kusamaAddress,
      },
      {
        args: {
          collection_id: collectionId,
          item_id: tokenId,
          recipient: {
            substrate: buyer.uniqueAddress,
          },
          value: '1',
        },
        isSigned: true,
        method: 'transfer',
        section: 'unique',
        signerAddress: market.uniqueAddress,
      },
      {
        args: {
          dest: {
            id: seller.kusamaAddress,
          },
          value: '108',
        },
        isSigned: true,
        method: 'transferKeepAlive',
        section: 'balances',
        signerAddress: market.kusamaAddress,
      },
    ]);
  }, 30_000);
});
