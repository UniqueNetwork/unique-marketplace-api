import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

import { initApp, runMigrations, prepareTradesData } from './data';

describe('Trades service old', () => {
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

    const doSort = async (sort: string = 'desc(TradeDate)', checkStatus: number = 200) => {
        let sorter = sort === null ? '' : `&sort=${sort}`;
        let res = await request(app.getHttpServer()).get(`/trades?page=1&pageSize=20${sorter}`);
        if (checkStatus !== null) await expect(res.statusCode).toBe(200);
        return res;
    };

    it('/trades (GET, sorting)', async () => {
        const expectTokens = async (res, tokens, length = 3) => {
            await expect(res.body.items.length).toBe(length);
            await expect(res.body.items.map((x) => `${x.collectionId}:${x.tokenId}`)).toEqual(tokens);
        };

        await expectTokens(await doSort('desc(TradeDate)'), ['1:2', '3:1', '2:3']);
        // By default it is desc(TradeDate)
        await expectTokens(await doSort(null), ['1:2', '3:1', '2:3']);
        await expectTokens(await doSort('asc(TradeDate)'), ['2:3', '3:1', '1:2']);
        await expectTokens(await doSort('desc(CollectionId)'), ['3:1', '2:3', '1:2']);
        await expectTokens(await doSort('asc(CollectionId)'), ['1:2', '2:3', '3:1']);

        await expectTokens(await doSort('desc(TokenId)'), ['2:3', '1:2', '3:1']);
        await expectTokens(await doSort('asc(TokenId)'), ['3:1', '1:2', '2:3']);

        await expectTokens(await doSort('desc(Price)'), ['1:2', '2:3', '3:1']);
        await expectTokens(await doSort('asc(Price)'), ['3:1', '2:3', '1:2']);
    });
});
