import { BroadcastService } from '../../src/broadcast/services/broadcast.service';
import { getEventHook } from './base';
import { initApp } from '../data';
import { connect as connectSocket, Socket } from 'socket.io-client';
import { BroadcastIOEmitter, ClientToServerEvents, ServerToClientEvents } from '../../src/broadcast/types';
import { PostgresIoAdapter } from '../../src/broadcast/services/postgres-io.adapter';
import { MarketConfig } from '../../src/config/market-config';
import { INestApplication } from '@nestjs/common';
import { OfferContractAskDto } from '../../src/offers/dto/offer-dto';
import { Test } from '@nestjs/testing';
import { BroadcastModule } from '../../src/broadcast/broadcast.module';

describe(`${BroadcastService.name} - emitter`, () => {
  let app: INestApplication;
  let anotherAppInstance: INestApplication;
  let clientSocket: Socket<ServerToClientEvents, ClientToServerEvents>;
  let emitter: BroadcastIOEmitter;

  beforeAll(async () => {
    app = await initApp();
    app.useWebSocketAdapter(new PostgresIoAdapter(app));
    await app.init();

    const config = app.get<MarketConfig>('CONFIG', { strict: false });

    const testingModuleBuilder = await Test.createTestingModule({
      imports: [BroadcastModule],
    });

    emitter = await PostgresIoAdapter.createIOEmitter(config);

    const moduleFixture = await testingModuleBuilder.compile();
    anotherAppInstance = moduleFixture.createNestApplication();
    anotherAppInstance.useWebSocketAdapter(new PostgresIoAdapter(app));
    await anotherAppInstance.init();
    await anotherAppInstance.getHttpServer().listen();

    const { address, port } = app.getHttpServer().listen().address();

    const appUrl = `http://[${address}]:${port}`;
    clientSocket = connectSocket(appUrl, { transports: ['polling'] });

    await new Promise<void>((resolve) => {
      clientSocket.once('connect', () => {
        console.log(`connected to ${appUrl}`);
        resolve();
      });
    });
  });

  afterAll(async () => {
    await app.close();
    await new Promise((resolve) => emitter.pool.end(resolve));
  });

  it('works', async () => {
    const [untilEvent, allEventsReceived] = getEventHook();
    const offers = [];

    clientSocket.on('auctionStarted', (offer) => {
      offers.push(offer);

      if (offers.length === 1) allEventsReceived();
    });

    console.log(2);

    const now = Date.now();

    const offer: OfferContractAskDto = {
      collectionId: now,
      creationDate: new Date(),
      price: now.toFixed(),
      quoteId: now,
      seller: now.toFixed(),
      tokenId: now,
    };

    await new Promise((resolve) => setTimeout(resolve, 3000));

    emitter.emit('auctionStarted', offer);

    const broadcastService = anotherAppInstance.get(BroadcastService);
    broadcastService.sendAuctionStarted(offer);

    await untilEvent;

    expect(offers[0]).toMatchObject({ ...offer, creationDate: expect.any(String) });
  }, 15_000);
});
