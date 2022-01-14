import { INestApplication } from '@nestjs/common';
import { initApp, prepareSearchData, runMigrations, searchByFilterOffers } from './data';

describe('Offers service', () => {
    let app: INestApplication;

    beforeAll(async () => {
        app = await initApp();
        await runMigrations(app.get('CONFIG'));
        await app.init();
        await prepareSearchData(app.get('DATABASE_CONNECTION').createQueryBuilder());
    });

    afterAll(async () => {
        await app.close();
    });

    it('/offers (GET, response status 200)', async () => {
        let response = await searchByFilterOffers(app, {}, { collectionId: [], traitsCount: [] }, { sort: [{ order: 1, column: '' }] });
        await expect(response.statusCode).toBe(200);
    });

    // No tokens with that trait
    it('/offers (GET, No tokens with that trait)', async () => {
        let response = await searchByFilterOffers(
            app,
            {},
            { searchText: 'Not exists trait', collectionId: [], traitsCount: [] },
            { sort: [{ order: 1, column: '' }] },
        );

        await expect(response.statusCode).toBe(200);
        await expect(response.body.items.length).toBe(0);
    });

    // All tokens has that trait
    it('/offers (GET, All tokens has that trait)', async () => {
        let response = await searchByFilterOffers(app, {}, { searchText: 'Smile', collectionId: [], traitsCount: [] }, { sort: [{ order: 1, column: '' }] });
        await expect(response.body.items.length).toBe(3);
        await expect(response.body.items.map((x) => x.tokenId)).toStrictEqual([12, 42, 120]);
    });

    // Trait for several tokens
    it('/offers (GET, Trait for several tokens)', async () => {
        let response = await searchByFilterOffers(
            app,
            {},
            { searchText: 'Left Earring', collectionId: [], traitsCount: [] },
            { sort: [{ order: 1, column: '' }] },
        );
        await expect(response.body.items.length).toBe(2);
        await expect(response.body.items.map((x) => x.tokenId)).toStrictEqual([12, 42]);
    });

    // Only one token has that trait
    it('/offers (GET, Only one token has that trait)', async () => {
        //
        let response = await searchByFilterOffers(
            app,
            {},
            { searchText: 'Asian Eyes', collectionId: [], traitsCount: [] },
            { sort: [{ order: 1, column: '' }] },
        );
        await expect(response.statusCode).toBe(200);
        await expect(response.body.items.length).toBe(1);
        await expect(response.body.items[0].tokenId).toBe(42);
    });

    // Search by tokenId (120 contains 12)
    it('/offers (GET, Search by tokenId (12 contains 120))', async () => {
        let response = await searchByFilterOffers(app, {}, { searchText: '12', collectionId: [], traitsCount: [] }, { sort: [{ order: 1, column: '' }] });
        await expect(response.statusCode).toBe(200);
        await expect(response.body.items.length).toBe(2);
        await expect(response.body.items.map((x) => x.tokenId)).toStrictEqual([12, 120]);
    });

    // Search by unique tokenId
    it('/offers (GET, Search by unique tokenId)', async () => {
        let response = await searchByFilterOffers(app, {}, { searchText: '42', collectionId: [], traitsCount: [] }, { sort: [{ order: 1, column: '' }] });
        await expect(response.statusCode).toBe(200);
        await expect(response.body.items.length).toBe(1);
        await expect(response.body.items[0].tokenId).toBe(42);
    });

    // Search by not exists tokenId
    it('/offers (GET, Search by not exists tokenId)', async () => {
        let response = await searchByFilterOffers(app, {}, { searchText: '122', collectionId: [], traitsCount: [] }, { sort: [{ order: 1, column: '' }] });
        await expect(response.statusCode).toBe(200);
        await expect(response.body.items.length).toBe(0);
    });

    // Find collection 23
    it('/offers?collectionId=23 (GET, Find collection 23 )', async () => {
        let response = await searchByFilterOffers(app, {}, { collectionId: [23], traitsCount: [] }, { sort: [{ order: 1, column: '' }] });
        await expect(response.statusCode).toBe(200);
        // console.dir(response.body, { depth: 4 });
        await expect(response.body.items.length).toBe(3);
    });

    // Find two items on one page
    it('/offers?page=1&pageSize=2 (GET, Find two items on one page)', async () => {
        let response = await searchByFilterOffers(app, { page: 1, pageSize: 2 }, { collectionId: [], traitsCount: [] }, { sort: [{ order: 1, column: '' }] });
        await expect(response.statusCode).toBe(200);
        await expect(response.body.items.length).toBe(2);
    });

    // Bad request
    it('/offers?page=0 (GET,  Bad Request)', async () => {
        // выполняем поиск по фильтру в Offers
        let response = await searchByFilterOffers(app, { page: 0, pageSize: 0 }, { collectionId: [], traitsCount: [] }, { sort: [{ order: 0, column: '' }] });
        await expect(response.statusCode).toBe(400);
        await expect(response.text).toBe('{"statusCode":400,"message":"Parameter page must be a positive integer, value: 0","error":"Bad Request"}');
    });
});
