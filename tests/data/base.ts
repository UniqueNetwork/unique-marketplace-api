import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { createConnection } from 'typeorm';

import { getConfig } from '../../src/config';
import { AppModule } from '../../src/app.module';
import { activeMigrations } from '../../src/migrations';
import { ProjectNamingStrategy } from '../../src/database/naming_strategy';
import { ignoreQueryCase, useGlobalPipes } from '../../src/utils/application';
import { OfferSortingRequest } from '../../src/utils/sorting/sorting-request';
import { PaginationRequest } from '../../src/utils/pagination/pagination-request';
import { OffersFilter } from '../../src/offers/offers-filter';
import * as request from 'supertest';

const testConfigFactory = (extra?) => () => {
    let config = getConfig();
    config.postgresUrl = config.testingPostgresUrl;
    config = { ...config, ...(extra || {}) };
    return config;
};

export const initApp = async (config?): Promise<INestApplication> => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
    })
        .overrideProvider('CONFIG')
        .useFactory({ factory: testConfigFactory(config) })
        .compile();

    const app = moduleFixture.createNestApplication();
    ignoreQueryCase(app);
    useGlobalPipes(app);
    return app;
};

export const getMigrationsConnection = async (config, logging: boolean = false) => {
    return await createConnection({
        name: 'migrations',
        type: 'postgres',
        url: config.postgresUrl,
        logging: logging,
        migrations: activeMigrations,
        namingStrategy: new ProjectNamingStrategy(),
    });
};

export const runMigrations = async (config) => {
    const connection = await getMigrationsConnection(config);
    await connection.dropDatabase();
    await connection.runMigrations({ transaction: 'all' });
    await connection.close();
};

export const genOffer = (
    id,
    {
        creationDate = null,
        collectionId = 1,
        tokenId = 1,
        price = '0000000000000000000000000000100000000000',
        seller = 'jq8EFRaHc2Mmyf6hfiX8UodhNpPJEpCcsiaqR5Tyakg=',
        sellerPublicKeyBytes = "E'\\\\x8EAF04151687736326C9FEA17E25FC5287613693C912909CB226AA4794F26A48'",
        offerStatus = 1,
        quoteId = 2,
        metadata = null,
    },
) => {
    if (metadata === null) metadata = { gender: '0', traits: ['2', '6', '10', '13', '17'] };
    if (creationDate === null) creationDate = new Date().toISOString().split('T').join(' ').split('Z')[0];
    return {
        id,
        creationDate,
        collectionId,
        tokenId,
        price,
        seller,
        offerStatus,
        sellerPublicKeyBytes,
        quoteId,
        metadata,
    };
};

/**
 * Converts sort: OfferSortingRequest to url string
 * @param {OfferSortingRequest} sortFilter
 * @param {String} filterData
 */
export const sortToString = (sortFilter: OfferSortingRequest) => {
    let filterData: string = '';
    let { sort } = sortFilter;
    if (sort.length !== 0) {
        sort.map((value) => {
            if (value.column === undefined || value.column === '') {
                return filterData;
            } else {
                value.order === 0 ? (filterData = `&sort=asc%28${value.column}%29`) : (filterData = `&sort=desc%28${value.column}%29`);
            }
        });
    }

    return filterData;
};

/**
 * Offers filter for test endpoint (GET /offers?)
 * @description Assembles a query to find the data specified in the get request in OffersService
 * @param {INestApplication} app - Application
 * @param {PaginationRequest} pagination - { page, pageSize }
 * @param {OffersFilter} offersFilter - { collectionId, searchText, searchLocale, minPrice, maxPrice, seller, traitsCount }
 * @param {OfferSortingRequest} sort - { sort: [{ order: 1, column: 'Price' }] } === desc(Price)
 */
export const searchByFilterOffers = async (app: INestApplication, pagination: PaginationRequest, offersFilter: OffersFilter, sort: OfferSortingRequest) => {
    let filterRequest: string = '/offers?';
    let { page, pageSize } = pagination;
    let { collectionId, searchText, searchLocale, minPrice, maxPrice, seller, traitsCount } = offersFilter;
    page !== undefined ? (filterRequest += `page=${page}`) : filterRequest;
    pageSize !== undefined ? (filterRequest += `&pageSize=${pageSize}`) : filterRequest;
    collectionId.length !== 0 ? collectionId.forEach((cid) => (filterRequest += `&collectionId=${cid}`)) : filterRequest;
    traitsCount.length !== 0 ? traitsCount.forEach((tid) => (filterRequest += `&traitsCount=${tid}`)) : filterRequest;
    searchLocale ? (filterRequest += `&searchLocale=${searchLocale}`) : filterRequest;

    if (searchText) {
        searchText = searchText.split(' ').join('%20');
        filterRequest += `&searchText=${searchText}`;
    }
    minPrice !== undefined ? (filterRequest += `&minPrice=${minPrice}`) : filterRequest;
    maxPrice !== undefined ? (filterRequest += `&maxPrice=${maxPrice}`) : filterRequest;
    seller !== undefined ? (filterRequest += `&seller=${seller}`) : filterRequest;

    // Possible values: asc(Price), desc(Price), asc(TokenId), desc(TokenId), asc(CreationDate), desc(CreationDate).
    filterRequest += sortToString(sort);

    return request(app.getHttpServer()).get(filterRequest);
};
