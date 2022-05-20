import { INestApplication } from '@nestjs/common';
import { initApp, runMigrations, searchByFilterOffers } from './data';
import { prepareTokenData, prepareBlockData, prepareOfferData, prepareAuctionData } from './data/offers';
import * as request from 'supertest';

describe('Offers service', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await initApp();
    await runMigrations(app.get('CONFIG'));
    await app.init();

    await prepareTokenData(app.get('DATABASE_CONNECTION').createQueryBuilder());
    await prepareBlockData(app.get('DATABASE_CONNECTION').createQueryBuilder());
    await prepareOfferData(app.get('DATABASE_CONNECTION').createQueryBuilder());
    await prepareAuctionData(app.get('DATABASE_CONNECTION').createQueryBuilder());
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /offers HttpStatus', () => {
    it('should return response status 200)', async () => {
      let response = await searchByFilterOffers(app, {}, { collectionId: [], numberOfAttributes: [], attributes: [] }, { sort: [{ order: 1, column: '' }] });
      await expect(response.statusCode).toBe(200);
    });
    it('should return response status 400 (Bad Request) set page=0', async () => {
      // выполняем поиск по фильтру в Offers
      let response = await searchByFilterOffers(app, { page: 0, pageSize: 0 }, { collectionId: [], numberOfAttributes: [], attributes: [] }, { sort: [{ order: 0, column: '' }] });
      await expect(response.statusCode).toBe(400);
      await expect(response.text).toBe('{"statusCode":400,"message":"Parameter page must be a positive integer, value: 0","error":"Bad Request"}');
    });
  });

  describe('POST, PATH, DELETE /offers HttpStatus', () => {
    it('should return response status 404 (Not Found)  )', async () => {
      const filterRequest = '/offers';
      const req = await request(app.getHttpServer()).post(filterRequest);
      await expect(req.statusCode).toBe(404);
    });
  });

  describe('GET /offers', () => {
    // No tokens with that trait
    it('/offers (GET, No tokens with that trait)', async () => {
      let response = await searchByFilterOffers(
        app,
        {},
        { searchText: 'Not exists trait', collectionId: [], numberOfAttributes: [], attributes: [] },
        { sort: [{ order: 1, column: '' }] },
      );
      await expect(response.statusCode).toBe(200);
      await expect(response.body.items.length).toBe(0);
    });

    it('/offers (GET, list of seven offers)', async () => {
      let response = await searchByFilterOffers(app, {}, { collectionId: [], numberOfAttributes: [], attributes: [] }, { sort: [{ order: 1, column: '' }] });

      await expect(response.statusCode).toBe(200);
      await expect(response.body.items.length).toBe(10);
    });

    // All tokens has that trait
    it('/offers (GET, All tokens has that trait)', async () => {
      let response = await searchByFilterOffers(
        app,
        {},
        {
          searchText: 'Zahar',
          collectionId: [],
          numberOfAttributes: [],
          attributes: []
        },
        { sort: [{ order: 1, column: '' }] },
      );
      await expect(response.body.items.length).toBe(1);

      await expect(response.body.items.map((x) => x.tokenId)).toStrictEqual([2]);
    });

    // Trait for several tokens
    it('/offers (GET, Trait for several tokens)', async () => {
      let response = await searchByFilterOffers(
        app,
        {},
        { searchText: 'Tired Eyes', collectionId: [], numberOfAttributes: [], attributes: [] },
        { sort: [{ order: 1, column: '' }] },
      );
      await expect(response.body.items.length).toBe(2);
      await expect(response.body.items.map((x) => x.tokenId)).toStrictEqual([2, 3]);
    });

    // Trait for several tokens
    it('/offers (GET, Trait count sort price)', async () => {
      let response = await searchByFilterOffers(app, {}, { collectionId: [], numberOfAttributes: [2, 3, 4], attributes: [] }, { sort: [{ order: 1, column: 'Price' }] });
      await expect(response.body.items.length).toBe(2);
      await expect(response.body.items.map((x) => x.tokenId)).toStrictEqual([1, 2]);
    });

    // Only one token has that trait
    it('/offers (GET, Only one token has that trait search: "Nose Ring")', async () => {
      //
      let response = await searchByFilterOffers(
        app,
        {},
        { searchText: 'Nose Ring', collectionId: [], numberOfAttributes: [2,3,4], attributes: [] },
        { sort: [{ order: 1, column: '' }] },
      );
      await expect(response.statusCode).toBe(200);
      await expect(response.body.items.length).toBe(1);
      await expect(response.body.items.map((x) => x.tokenId)).toStrictEqual([2]);
    });

    // Only one token has that trait
    it('/offers (GET, Only one token has that trait search: "nose ring" LowerCase)', async () => {
      //
      let response = await searchByFilterOffers(
        app,
        {},
        { searchText: 'nose ring', collectionId: [], numberOfAttributes: [2,3], attributes: [] },
        { sort: [{ order: 1, column: '' }] },
      );
      await expect(response.statusCode).toBe(200);
      await expect(response.body.items.length).toBe(1);
      await expect(response.body.items.map((x) => x.tokenId)).toStrictEqual([2]);
    });

    // Search by tokenId (120 contains 12)
    it('/offers (GET, Search by tokenId (3))', async () => {
      let response = await searchByFilterOffers(
        app,
        {},
        {
          searchText: '3',
          collectionId: [],
          numberOfAttributes: [],
          attributes: []
        },
        { sort: [{ order: 1, column: '' }] },
      );
      await expect(response.statusCode).toBe(200);
      await expect(response.body.items.length).toBe(2);
      await expect(response.body.items.map((x) => x.collectionId)).toStrictEqual([124, 1782]);
    });

    // Search by unique tokenId
    it('/offers (GET, Search by unique tokenId)', async () => {
      let response = await searchByFilterOffers(
        app,
        {},
        { searchText: 'Aleksandr Aleksandrov', collectionId: [], numberOfAttributes: [], attributes: [] },
        { sort: [{ order: 1, column: '' }] },
      );
      await expect(response.statusCode).toBe(200);
      await expect(response.body.items.length).toBe(1);
    });

    // Search by not exists tokenId
    it('/offers (GET, Search by not exists tokenId)', async () => {
      let response = await searchByFilterOffers(
        app,
        {},
        {
          searchText: '3221',
          collectionId: [],
          numberOfAttributes: [],
          attributes: []
        },
        { sort: [{ order: 1, column: '' }] },
      );
      await expect(response.statusCode).toBe(200);
      await expect(response.body.items.length).toBe(0);
    });

    // Find collection 562
    it('/offers?collectionId=562 (GET, Find collection 562 )', async () => {
      let response = await searchByFilterOffers(
        app,
        {},
        { collectionId: [562], numberOfAttributes: [], attributes: [] },
        {
          sort: [
            {
              order: 1,
              column: '',
            },
          ],
        },
      );
      await expect(response.statusCode).toBe(200);
      await expect(response.body.items.length).toBe(2);
    });

    it('/offers (GET, sort Price DESC)', async () => {
      let response = await searchByFilterOffers(
        app,
        {},
        { collectionId: [], numberOfAttributes: [], attributes: [] },
        {
          sort: [
            {
              order: 1,
              column: 'Price',
            },
          ],
        },
      );
      await expect(response.statusCode).toBe(200);
      await expect(response.body.items[0].price).toBe('901329162');
    });


    it('/offers (GET, sort Price ASC)', async () => {
      const mockCollection = ['124:1','124:6','124:4','124:5','124:2','124:3'];
      let response = await searchByFilterOffers(
        app,
        {},
        { collectionId: [124], numberOfAttributes: [], attributes: [] },
        {
          sort: [
            {
              order: 0,
              column: 'Price',
            },
          ],
        },
      );

      await expect(response.statusCode).toBe(200);
      await expect(response.body.items.map((x) => `${x.collectionId}:${x.tokenId}`)).toEqual(mockCollection);
      //await expect(response.body.items[0].price).toBe('27050000000000');
    });

    // Find two items on one page
    it('/offers?page=1&pageSize=2 (GET, Find two items on one page)', async () => {
      let response = await searchByFilterOffers(
        app,
        { page: 1, pageSize: 2 },
        {
          collectionId: [],
          numberOfAttributes: [],
          attributes: [],
        },
        { sort: [{ order: 1, column: '' }] },
      );
      await expect(response.statusCode).toBe(200);
      await expect(response.body.items.length).toBe(2);
    });

    it ('/offers?collectionId=562traits=Up%20Hair (GET, Find collection 2 and traits by field Up Hair  )?', async () => {
      let response = await searchByFilterOffers(
        app,
        {},
        {
          collectionId: [562],
          numberOfAttributes: [],
          attributes: ['Up%20Hair'],
        },
        { sort: [{ order: 1, column: '' }] }
      );
      await expect(response.statusCode).toBe(200);
      await expect(response.body.items.length).toBe(2);
    });


    it ('/offers?collectionId=562traits=Up%20Hair&traits=Teeth%20Smile (GET, Find collection 2 and traits by field Up Hair  )?', async () => {
      let response = await searchByFilterOffers(
        app,
        {},
        {
          collectionId: [562],
          numberOfAttributes: [],
          attributes: ['Up%20Hair', 'Teeth%20Smile'],
        },
        { sort: [{ order: 1, column: '' }] }
      );
      await expect(response.statusCode).toBe(200);
      await expect(response.body.items.length).toBe(1);
    });

    it ('/offers?isAuction=true (GET, find isAuction )?', async () => {
      let response = await searchByFilterOffers(
        app,
        {},
        {
          collectionId: [],
          numberOfAttributes: [],
          attributes: [],
          isAuction: 'true'
        },
        { sort: [{ order: 1, column: '' }] }
      );
      await expect(response.statusCode).toBe(200);
      await expect(response.body.items.length).toBe(4);
      await expect(response.body.items.map((x) => x.tokenId)).toStrictEqual([2, 1, 2, 3]);
    });
  });
  // Bad request
});
