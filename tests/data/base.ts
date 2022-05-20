import { INestApplication } from '@nestjs/common';
import { Test, TestingModuleBuilder } from '@nestjs/testing';
import { createConnection } from 'typeorm';

import { getConfig } from '../../src/config';
import { AppModule } from '../../src/app.module';
import { ignoreQueryCase, useGlobalPipes } from '../../src/utils/application';
import { OfferSortingRequest } from '../../src/utils/sorting/sorting-request';
import { PaginationRequest } from '../../src/utils/pagination/pagination-request';
import { OffersFilter } from '../../src/offers/dto/offers-filter';
import * as request from 'supertest';
import { getConnectionOptions } from '../../src/database/connection-options';
import { MarketConfig } from "../../src/config/market-config";

const testConfigFactory = (extra?: Partial<MarketConfig>) => (): MarketConfig => {
    let config = getConfig();
    config.postgresUrl = config.testingPostgresUrl;
    config = { ...config, ...(extra || {}) };
    return config;
};

type OverrideProviders = (builder: TestingModuleBuilder) => void;

export const initApp = async (config?: Partial<MarketConfig>, overrideProviders?: OverrideProviders): Promise<INestApplication> => {
    const testingModuleBuilder = await Test.createTestingModule({
        imports: [AppModule],
    });

    testingModuleBuilder
      .overrideProvider('CONFIG')
      .useFactory({ factory: testConfigFactory(config) })

    if (overrideProviders) overrideProviders(testingModuleBuilder);

    const moduleFixture = await testingModuleBuilder.compile();

    const app = moduleFixture.createNestApplication();
    ignoreQueryCase(app);
    useGlobalPipes(app);

    return app;
};

export const getMigrationsConnection = async (config, logging = false) => {
    const connectionOptions = getConnectionOptions(config, true, logging);
    return await createConnection({ ...connectionOptions, name: 'migrations' });
};

export const runMigrations = async (config) => {
    const connection = await getMigrationsConnection(config);
    await connection.dropDatabase();
    await connection.runMigrations({ transaction: 'all' });
    await connection.close();
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

  let filterRequest = '/offers?';

  const { page, pageSize } = pagination;

  const {
    collectionId,
    searchLocale,
    minPrice,
    maxPrice,
    seller,
    numberOfAttributes,
    attributes: traits,
    isAuction,
    bidderAddress } = offersFilter;

  let { searchText } = offersFilter;

  page !== undefined ? (filterRequest += `page=${page}`) : filterRequest;

  pageSize !== undefined ? (filterRequest += `&pageSize=${pageSize}`) : filterRequest;

  collectionId.length !== 0 ? collectionId.forEach((cid) => (filterRequest += `&collectionId=${cid}`)) : filterRequest;

  numberOfAttributes.length !== 0 ? numberOfAttributes.forEach((tid) => (filterRequest += `&traitsCount=${tid}`)) : filterRequest;

  searchLocale ? (filterRequest += `&searchLocale=${searchLocale}`) : filterRequest;

  traits.length !== 0 ? traits.forEach(
    (trait) => (filterRequest += `&traits=${trait.split(' ').join('%20')}`)
  ) : filterRequest;

  isAuction  ? (filterRequest += `&isAuction=${isAuction}`) : filterRequest;

  bidderAddress ? (filterRequest += `&bidderAddress=${bidderAddress}`) : filterRequest;


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
