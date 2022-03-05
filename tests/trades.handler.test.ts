import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

import { initApp, runMigrations, prepareTradesData, sortToString, searchByFilterOffers } from './data';
import { PaginationRequest } from '../src/utils/pagination/pagination-request';
import { TradeSortingRequest } from '../src/utils/sorting/sorting-request';

describe('Trades service', () => {
    let app: INestApplication;

    beforeAll(async () => {
        app = await initApp();
        await runMigrations(app.get('CONFIG'));
        await app.init();
        await prepareTradesData(app.get('DATABASE_CONNECTION').createQueryBuilder());
    });

    afterAll(async () => {
        await app.close();
    });

    // TODO: Attention! collectionId in controller is defined by weird type QueryParamArray
    const searchByFilterTradesGet = (app: INestApplication, pagination: PaginationRequest, accountId:string,  sort: TradeSortingRequest, collectionId?: number[]) => {
        let filterRequest: string = (accountId !== undefined) ? `/trades/${accountId}?` : `/trades?`;
        let { page, pageSize } = pagination;
        page !== undefined ? (filterRequest += `page=${page}`) : filterRequest;
        pageSize !== undefined ? (filterRequest += `&pageSize=${pageSize}`) : filterRequest;
        if (collectionId) {
            collectionId.length !== 0 ? collectionId.forEach((cid) => (filterRequest += `&collectionId=${cid}`)) : filterRequest;
        }
        filterRequest += sortToString(sort);
        return request(app.getHttpServer()).get(filterRequest);
    };

    describe('GET /trades HttpStatus', () => {
        it('should return response status 200', async () => {
            let response = await searchByFilterTradesGet(app, {},  undefined, { sort: [{ order: null, column: '' }] });
            await expect(response.statusCode).toBe(200);
        });

        it('should return response status 200 non-existent sort asc(Test) ', async () => {
            let response = await searchByFilterTradesGet(app, { page: 100 }, undefined,{ sort: [{ order: 0, column: 'Test' }] }, [10]);
            await expect(response.statusCode).toBe(200);
        });

        it('should return response status 400 (Bad Request) sort page: 0 )', async () => {
            let response = await searchByFilterTradesGet(app, { page: 0, pageSize: 0 }, undefined,{ sort: [{ order: 0, column: '' }] });
            await expect(response.statusCode).toBe(400);
        });
    });

    describe('POST /trades HttpStatus', () => {
        it('should return response status 404 (Not Found)  )', async () => {
            const filterRequest: string = '/trades?';
            const req = await request(app.getHttpServer()).post(filterRequest);
            await expect(req.statusCode).toBe(404);
        });
    });

    describe('GET /trades', () => {
        it('should return sort Null with 3 tokens', async () => {
            let response = await searchByFilterTradesGet(app, { page: 1, pageSize: 3 }, undefined,{ sort: [{ order: null, column: '' }] });
            const mockTokens = ['23:8674', '23:1809', '23:2384'];
            await expect(response.statusCode).toBe(200);
            await expect(response.body.items.length).toBe(3);

            await expect(response.body.items.map((x) => `${x.collectionId}:${x.tokenId}`)).toEqual(mockTokens);
        });

        it('should return sort asc(TradeDate) with 3 tokens', async () => {
            let response = await searchByFilterTradesGet(app, { pageSize: 3 }, undefined,{ sort: [{ order: 0, column: 'TradeDate' }] });
            const mockTokens = ['25:9434', '25:43', '25:4514'];
            await expect(response.statusCode).toBe(200);
            await expect(response.body.items.length).toBe(3);
            await expect(response.body.items.map((x) => `${x.collectionId}:${x.tokenId}`)).toEqual(mockTokens);
        });

        it('should return sort desc(CollectionId) with tokens', async () => {
            let response = await searchByFilterTradesGet(app, { pageSize: 5 }, undefined,{ sort: [{ order: 1, column: 'CollectionId' }] });
            const mockTokens = ['25:4543', '25:4543', '25:4514', '25:4514', '25:4514'];
            await expect(response.statusCode).toBe(200);
            await expect(response.body.items.length).toBe(5);
            await expect(response.body.items.map((x) => `${x.collectionId}:${x.tokenId}`)).toEqual(mockTokens);
        });

        it('should return sort asc(CollectionId) with tokens 10 pages default', async () => {
            let response = await searchByFilterTradesGet(app, {}, undefined,{ sort: [{ order: 0, column: 'CollectionId' }] });
            const mockTokens = ['23:8674', '23:1809', '23:2384', '23:3074', '23:239', '23:2275', '23:9053', '23:1152', '23:4142', '23:8733'];
            await expect(response.statusCode).toBe(200);
            await expect(response.body.items.length).toBe(10);
            await expect(response.body.items.map((x) => `${x.collectionId}:${x.tokenId}`)).toEqual(mockTokens);
        });

        it('should return sort desc(TokenId) with tokens 10 pages default', async () => {
            let response = await searchByFilterTradesGet(app, {}, undefined,{ sort: [{ order: 1, column: 'TokenId' }] });
            const mockTokens = ['25:9434', '23:9348', '23:9053', '23:8733', '23:8674', '25:4543', '25:4543', '25:4514', '25:4514', '25:4514'];
            await expect(response.statusCode).toBe(200);
            await expect(response.body.items.length).toBe(10);
            await expect(response.body.items.map((x) => `${x.collectionId}:${x.tokenId}`)).toEqual(mockTokens);
        });

        it('should return sort asc(TokenId) with tokens', async () => {
            let response = await searchByFilterTradesGet(app, {}, undefined,{ sort: [{ order: 0, column: 'TokenId' }] });
            const mockTokens = ['25:43', '25:43', '25:162', '25:190', '23:239', '23:1152', '23:1809', '23:2275', '23:2384', '23:3074'];
            await expect(response.statusCode).toBe(200);
            await expect(response.body.items.length).toBe(10);
            await expect(response.body.items.map((x) => `${x.collectionId}:${x.tokenId}`)).toEqual(mockTokens);
        });

        it('should return sort desc(Price) and 5 items ', async () => {
            let response = await searchByFilterTradesGet(app, { pageSize: 5 }, undefined,{ sort: [{ order: 1, column: 'Price' }] });
            const mockPrice = ['23:2600000000000', '23:2250000000000', '23:1500000000000', '23:1300000000000', '23:1000000000000'];
            await expect(response.statusCode).toBe(200);
            await expect(response.body.items.length).toBe(5);
            await expect(response.body.items.map((x) => `${x.collectionId}:${x.price}`)).toEqual(mockPrice);
        });

        it('should return sort asc(Price) with 5 items', async () => {
            let response = await searchByFilterTradesGet(app, { pageSize: 5 }, undefined,{ sort: [{ order: 0, column: 'Price' }] });
            const mockPrice = ['25:10000000000', '25:10000000000', '25:10000000000', '25:10000000000', '25:10000000000'];
            await expect(response.statusCode).toBe(200);
            await expect(response.body.items.length).toBe(5);
            await expect(response.body.items.map((x) => `${x.collectionId}:${x.price}`)).toEqual(mockPrice);
        });

        it('should return sort collectionId: 3', async () => {
            let response = await searchByFilterTradesGet(app, {}, undefined, { sort: [{ order: 0, column: '' }] }, [3]);
            await expect(response.statusCode).toBe(200);
            await expect(response.body.items.length).toBe(0);
        });

        it('should return sort page: 1 pageSize: 2  === length 2', async () => {
            let response = await searchByFilterTradesGet(app, { page: 1, pageSize: 2 },  undefined,{ sort: [{ order: 0, column: '' }] });

            await expect(response.statusCode).toBe(200);
            await expect(response.body.items.length).toBe(2);
        });

        it('should return 4 items, find by buyer and seller ', async () => {
            let response = await searchByFilterTradesGet(app, { page: 1, pageSize: 20 }, '5ECaAmPWvw9CAf7hi1tncBTcYFKy9pMahQA1LYZ5ET3of9WH',{ sort: [{ order: 0, column: '' }] });

            await expect(response.statusCode).toBe(200);
            await expect(response.body.items.length).toBe(4);
            await expect(response.body.items[0].buyer === '5ECaAmPWvw9CAf7hi1tncBTcYFKy9pMahQA1LYZ5ET3of9WH').toBe(true);
            await expect(response.body.items[3].seller === '5ECaAmPWvw9CAf7hi1tncBTcYFKy9pMahQA1LYZ5ET3of9WH').toBe(true);
        });
    });
});
