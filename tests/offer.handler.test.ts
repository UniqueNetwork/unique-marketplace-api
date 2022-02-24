import { INestApplication } from '@nestjs/common';
import { initApp, prepareSearchData, runMigrations, searchByFilterOffers } from './data';
import * as request from 'supertest';

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

    describe('GET /offers HttpStatus', () => {
        it('should return response status 200)', async () => {
            let response = await searchByFilterOffers(
                app,
                {},
                { collectionId: [], traitsCount: [] },
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
        });
        it('should return response status 400 (Bad Request) set page=0', async () => {
            // выполняем поиск по фильтру в Offers
            let response = await searchByFilterOffers(
                app,
                { page: 0, pageSize: 0 },
                { collectionId: [], traitsCount: [] },
                { sort: [{ order: 0, column: '' }] },
            );
            await expect(response.statusCode).toBe(400);
            await expect(response.text).toBe('{"statusCode":400,"message":"Parameter page must be a positive integer, value: 0","error":"Bad Request"}');
        });
    });

    describe('POST, PATH, DELETE /offers HttpStatus', () => {
        it('should return response status 404 (Not Found)  )', async () => {
            const filterRequest: string = '/offers';
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
                { searchText: 'Not exists trait', collectionId: [], traitsCount: [] },
                { sort: [{ order: 1, column: '' }] },
            );
            //console.log(response.body);
            await expect(response.statusCode).toBe(200);
            await expect(response.body.items.length).toBe(0);
        });

        // All tokens has that trait
        it('/offers (GET, All tokens has that trait)', async () => {
            let response = await searchByFilterOffers(
                app,
                {},
                {
                    searchText: 'Female',
                    collectionId: [],
                    traitsCount: [],
                },
                { sort: [{ order: 1, column: '' }] },
            );
            await expect(response.body.items.length).toBe(1);

            await expect(response.body.items.map((x) => x.tokenId)).toStrictEqual([5817]);
        });

        // Trait for several tokens
        it('/offers (GET, Trait for several tokens)', async () => {
            let response = await searchByFilterOffers(
                app,
                {},
                { searchText: 'Black Earrings', collectionId: [], traitsCount: [] },
                { sort: [{ order: 1, column: '' }] },
            );
            await expect(response.body.items.length).toBe(1);
            await expect(response.body.items.map((x) => x.tokenId)).toStrictEqual([4017]);
        });

        // Only one token has that trait
        it('/offers (GET, Only one token has that trait search: "Asian Eyes")', async () => {
            //
            let response = await searchByFilterOffers(
                app,
                {},
                { searchText: 'Asian Eyes', collectionId: [], traitsCount: [1] },
                { sort: [{ order: 1, column: '' }] },
            );
            await expect(response.statusCode).toBe(200);
            await expect(response.body.items.length).toBe(1);
            await expect(response.body.items[0].tokenId).toBe(5817);
        });

        // Search by tokenId (120 contains 12)
        it('/offers (GET, Search by tokenId (5817))', async () => {
            let response = await searchByFilterOffers(
                app,
                {},
                {
                    searchText: '5817',
                    collectionId: [],
                    traitsCount: [],
                },
                { sort: [{ order: 1, column: '' }] },
            );
            await expect(response.statusCode).toBe(200);
            await expect(response.body.items.length).toBe(1);
            await expect(response.body.items.map((x) => x.tokenId)).toStrictEqual([5817]);
        });

        // Search by unique tokenId
        it('/offers (GET, Search by unique tokenId)', async () => {
            let response = await searchByFilterOffers(
                app,
                {},
                { searchText: '3-day Stubble Black', collectionId: [], traitsCount: [] },
                { sort: [{ order: 1, column: '' }] },
            );
            await expect(response.statusCode).toBe(200);
            await expect(response.body.items.length).toBe(0);
        });

        // Search by not exists tokenId
        it('/offers (GET, Search by not exists tokenId)', async () => {
            let response = await searchByFilterOffers(
                app,
                {},
                {
                    searchText: '3221',
                    collectionId: [],
                    traitsCount: [],
                },
                { sort: [{ order: 1, column: '' }] },
            );
            await expect(response.statusCode).toBe(200);
            await expect(response.body.items.length).toBe(0);
        });

        // Find collection 23
        it('/offers?collectionId=23 (GET, Find collection 23 )', async () => {
            let response = await searchByFilterOffers(
                app,
                {},
                { collectionId: [23], traitsCount: [] },
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
            // console.dir(response.body, { depth: 4 });
            await expect(response.body.items.length).toBe(1);
        });

        // Find two items on one page
        it('/offers?page=1&pageSize=2 (GET, Find two items on one page)', async () => {
            let response = await searchByFilterOffers(
                app,
                { page: 1, pageSize: 2 },
                {
                    collectionId: [],
                    traitsCount: [],
                },
                { sort: [{ order: 1, column: '' }] },
            );
            await expect(response.statusCode).toBe(200);
            await expect(response.body.items.length).toBe(2);
        });
    });
    // Bad request
});
