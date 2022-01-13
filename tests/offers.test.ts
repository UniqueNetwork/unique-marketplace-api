import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

import { initApp, prepareSearchData, runMigrations } from './data/';

describe('Offers service old version', () => {
    let app: INestApplication;

    beforeAll(async () => {
        app = await initApp();
        await runMigrations(app.get('CONFIG'));
        await app.init();
        await prepareSearchData(app.get('DATABASE_CONNECTION').createQueryBuilder());
    });

    const doSearch = async (searchString: string) => {
        searchString = searchString.split(' ').join('%20');
        return request(app.getHttpServer()).get(
            `/offers?page=1&pageSize=5&collectionId=23&collectionId=25&sort=desc(creationDate)&searchLocale=en&searchText=${searchString}`,
        );
    };

    afterAll(async () => {
        await app.close();
    });

    it('/offers (GET, Only one token has that trait)', async () => {
        // Only one token has that trait
        let response = await doSearch('Asian Eyes');
        await expect(response.statusCode).toBe(200);
        await expect(response.body.items.length).toBe(1);
        await expect(response.body.items[0].tokenId).toBe(42);
    });

    it('/offers (GET, No tokens with that trait)', async () => {
        // No tokens with that trait
        let response = await doSearch('Not exists trait');
        await expect(response.statusCode).toBe(200);
        await expect(response.body.items.length).toBe(0);
    });

    it('/offers (GET, All tokens has that trait)', async () => {
        // All tokens has that trait
        let response = await doSearch('Smile');
        await expect(response.body.items.length).toBe(3);
        await expect(response.body.items.map((x) => x.tokenId)).toStrictEqual([120, 42, 12]);
    });

    it('/offers (GET, Trait for several tokens)', async () => {
        // Trait for several tokens
        let response = await doSearch('Left Earring');
        await expect(response.body.items.length).toBe(2);
        await expect(response.body.items.map((x) => x.tokenId)).toStrictEqual([42, 12]);
    });

    it('/offers (GET, Search by tokenId (120 contains 12))', async () => {
        // Search by tokenId (120 contains 12)
        let response = await doSearch('12');
        await expect(response.statusCode).toBe(200);
        await expect(response.body.items.length).toBe(2);
        await expect(response.body.items.map((x) => x.tokenId)).toStrictEqual([120, 12]);
    });

    it('/offers (GET, Search by unique tokenId)', async () => {
        // Search by unique tokenId
        let response = await doSearch('42');
        await expect(response.statusCode).toBe(200);
        await expect(response.body.items.length).toBe(1);
        await expect(response.body.items[0].tokenId).toBe(42);
    });

    it('/offers (GET, Search by not exists tokenId)', async () => {
        // Search by not exists tokenId
        let responses = await doSearch('122');
        await expect(responses.statusCode).toBe(200);
        await expect(responses.body.items.length).toBe(0);
    });
});
