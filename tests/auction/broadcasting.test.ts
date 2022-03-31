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

const buildOffer = (price: string): OfferContractAskDto => ({
  price,
  collectionId: 1,
  creationDate: new Date(),
  quoteId: 2,
  seller: '3',
  tokenId: 4,
})

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
      clientSocket.once('connect', resolve);
    });
  });

  afterAll(async () => {
    await app.close();
    await emitter.pool.end();
  });

  it('works', async () => {
    const [untilEvent, allEventsReceived] = getEventHook();
    const offers = [];

    clientSocket.on('auctionStarted', (offer) => {
      offers.push(offer);

      if (offers.length === 3) allEventsReceived();
    });

    await new Promise((resolve) => setTimeout(resolve, 3000));

    emitter.emit('auctionStarted', buildOffer('foo'));
    anotherAppInstance.get(BroadcastService).sendAuctionStarted(buildOffer('bar'));
    app.get(BroadcastService).sendAuctionStarted(buildOffer('baz'));

    await untilEvent;


    expect(offers.length).toBe(3);
    expect(offers.map((o) => o.price).sort().reverse()).toMatchObject(['foo', 'baz', 'bar']);
  }, 15_000);
});
