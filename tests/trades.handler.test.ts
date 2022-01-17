import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

import { initApp, runMigrations, prepareTradesData, sortToString, searchByFilterOffers } from './data';
import { PaginationRequest } from '../src/utils/pagination/pagination-request';
import { TradeSortingRequest } from '../src/utils/sorting/sorting-request';
import { QueryParamArray } from '../src/utils/query-param-array';

describe('Trades service', () => {
    let app: INestApplication;

    beforeAll(async () => {
        app = await initApp();
        await runMigrations(app.get('CONFIG'));
        await app.init();
        //await prepareTradesData(app.get('DATABASE_CONNECTION').createQueryBuilder());
    });

    afterAll(async () => {
        await app.close();
    });

    // TODO: Attention! collectionId in controller is defined by weird type QueryParamArray
    const searchByFilterTradesGet = (app: INestApplication, pagination: PaginationRequest, sort: TradeSortingRequest, collectionId?: number[]) => {
        let filterRequest: string = '/trades?';
        let { page, pageSize } = pagination;
        page !== undefined ? (filterRequest += `page=${page}`) : filterRequest;
        pageSize !== undefined ? (filterRequest += `&pageSize=${pageSize}`) : filterRequest;
        if (collectionId) {
            collectionId.length !== 0 ? collectionId.forEach((cid) => (filterRequest += `&collectionId=${cid}`)) : filterRequest;
        }
        filterRequest += sortToString(sort);
        return request(app.getHttpServer()).get(filterRequest);
    };

  /**
   * @deprecated
   * @param sort
   * @param checkStatus
   */
    const doSort = async (sort: string = 'desc(TradeDate)', checkStatus: number = 200) => {
        let sorter = sort === null ? '' : `&sort=${sort}`;
        let res = await request(app.getHttpServer()).get(`/trades?page=1&pageSize=20${sorter}`);
        if (checkStatus !== null) await expect(res.statusCode).toBe(200);
        return res;
    };

    it('/trades (GET, response status 200)', async () => {
        let response = await searchByFilterTradesGet(app, {}, { sort: [{ order: null, column: '' }] });
        await expect(response.statusCode).toBe(200);
    });
/*
    it('/trades (GET, sort Null with tokens)', async () => {
        let response = await searchByFilterTradesGet(app, {}, { sort: [{ order: null, column: '' }] });
        const mockTokens = ['1:2', '3:1', '2:3'];
        await expect(response.statusCode).toBe(200);
        await expect(response.body.items.length).toBe(3);
        await expect(response.body.items.map((x) => `${x.collectionId}:${x.tokenId}`)).toEqual(mockTokens);
    });

    it('/trades (GET, sort asc(TradeDate) with tokens)', async () => {
        let response = await searchByFilterTradesGet(app, {}, { sort: [{ order: 0, column: 'TradeDate' }] });
        const mockTokens = ['2:3', '3:1', '1:2'];
        await expect(response.statusCode).toBe(200);
        await expect(response.body.items.length).toBe(3);
        await expect(response.body.items.map((x) => `${x.collectionId}:${x.tokenId}`)).toEqual(mockTokens);
    });

    it('/trades (GET, sort desc(CollectionId) with tokens)', async () => {
        let response = await searchByFilterTradesGet(app, {}, { sort: [{ order: 1, column: 'CollectionId' }] });
        const mockTokens = ['3:1', '2:3', '1:2'];
        await expect(response.statusCode).toBe(200);
        await expect(response.body.items.length).toBe(3);
        await expect(response.body.items.map((x) => `${x.collectionId}:${x.tokenId}`)).toEqual(mockTokens);
    });

    it('/trades (GET, sort asc(CollectionId) with tokens)', async () => {
        let response = await searchByFilterTradesGet(app, {}, { sort: [{ order: 0, column: 'CollectionId' }] });
        const mockTokens = ['1:2', '2:3', '3:1'];
        await expect(response.statusCode).toBe(200);
        await expect(response.body.items.length).toBe(3);
        await expect(response.body.items.map((x) => `${x.collectionId}:${x.tokenId}`)).toEqual(mockTokens);
    });

    it('/trades (GET, sort desc(TokenId) with tokens)', async () => {
        let response = await searchByFilterTradesGet(app, {}, { sort: [{ order: 1, column: 'TokenId' }] });
        const mockTokens = ['2:3', '1:2', '3:1'];
        await expect(response.statusCode).toBe(200);
        await expect(response.body.items.length).toBe(3);
        await expect(response.body.items.map((x) => `${x.collectionId}:${x.tokenId}`)).toEqual(mockTokens);
    });

    it('/trades (GET, sort asc(TokenId) with tokens)', async () => {
        let response = await searchByFilterTradesGet(app, {}, { sort: [{ order: 0, column: 'TokenId' }] });
        const mockTokens = ['3:1', '1:2', '2:3'];
        await expect(response.statusCode).toBe(200);
        await expect(response.body.items.length).toBe(3);
        await expect(response.body.items.map((x) => `${x.collectionId}:${x.tokenId}`)).toEqual(mockTokens);
    });

    it('/trades (GET, sort desc(Price) with tokens)', async () => {
        let response = await searchByFilterTradesGet(app, {}, { sort: [{ order: 1, column: 'Price' }] });
        const mockTokens = ['1:2', '2:3', '3:1'];
        await expect(response.statusCode).toBe(200);
        await expect(response.body.items.length).toBe(3);
        await expect(response.body.items.map((x) => `${x.collectionId}:${x.tokenId}`)).toEqual(mockTokens);
    });

    it('/trades (GET, sort asc(Price) with tokens)', async () => {
        let response = await searchByFilterTradesGet(app, {}, { sort: [{ order: 0, column: 'Price' }] });
        const mockTokens = ['3:1', '2:3', '1:2'];
        await expect(response.statusCode).toBe(200);
        await expect(response.body.items.length).toBe(3);
        await expect(response.body.items.map((x) => `${x.collectionId}:${x.tokenId}`)).toEqual(mockTokens);
    });

    it('/trades (GET, sort collectionId: 3)', async () => {
        let response = await searchByFilterTradesGet(app, {}, { sort: [{ order: 0, column: '' }] }, [3]);
        await expect(response.statusCode).toBe(200);
        await expect(response.body.items.length).toBe(1);
    });

    it('/trades (GET, sort page: 1 pageSize: 2  === length 2)', async () => {
        let response = await searchByFilterTradesGet(app, { page: 1, pageSize: 2 }, { sort: [{ order: 0, column: '' }] });

        await expect(response.statusCode).toBe(200);
        await expect(response.body.items.length).toBe(2);
    });
*/
    it('/trades (GET, sort page: 0 Bad Request)', async () => {
        let response = await searchByFilterTradesGet(app, { page: 0, pageSize: 0 }, { sort: [{ order: 0, column: '' }] });
        await expect(response.statusCode).toBe(400);
    });

    /*
    it('/trades (GET, sort asc(Test) Internal Server Error)', async () => {
        let response = await searchByFilterTradesGet(app, { page: 100 }, { sort: [{ order: 0, column: 'Test' }] }, [10]);
        console.dir(response.body, { depth: 4 });
        await expect(response.statusCode).toBe(500);
    });

     */
});
