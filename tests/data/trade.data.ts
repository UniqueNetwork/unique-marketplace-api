import { Offer, TokenTextSearch, Trade } from '../../src/entity';
import { genOffer } from './base';

const genTrade = (id, { tradeDate = null, buyer = 'jq8EFRaHc2Mmyf6hfiX8UodhNpPJEpCcsiaqR5Tyakg=', offerId, price }) => {
    if (tradeDate === null) tradeDate = new Date().toISOString().split('T').join(' ').split('Z')[0];
    return { id, tradeDate, buyer, offerId, price };
};

export const prepareTradesData = async (queryBuilder) => {
    await queryBuilder
        .insert()
        .values([
            genOffer('1b670fde-fa17-4a56-ab51-3af1a9ac893a', {
                collectionId: 1,
                tokenId: 2,
                price: '0000000000000000000000000000300000000000',
                offerStatus: 3,
                creationDate: '2021-01-01 00:00:00',
            }),
            genOffer('3f1a6051-a162-41ad-8266-52568265c4df', {
                collectionId: 3,
                tokenId: 1,
                price: '0000000000000000000000000000100000000000',
                offerStatus: 3,
                creationDate: '2021-01-02 00:00:00',
            }),
            genOffer('87c3a642-a194-42d3-a5f1-1c702dd294fe', {
                collectionId: 2,
                tokenId: 3,
                price: '0000000000000000000000000000200000000000',
                offerStatus: 3,
                creationDate: '2021-01-03 00:00:00',
            }),
        ])
        .into(Offer)
        .execute();

    await queryBuilder
        .insert()
        .values([
            genTrade('bf5103fb-fea5-4ebc-a59b-7878736f6c4d', {
              offerId: '1b670fde-fa17-4a56-ab51-3af1a9ac893a', tradeDate: '2021-02-03 00:00:00',
              price: '0000000000000000000000000000300000000000'
            }),
            genTrade('c7d65f3d-0aa6-4c8d-b2bc-d581af2801bc', {
              offerId: '3f1a6051-a162-41ad-8266-52568265c4df', tradeDate: '2021-02-02 00:00:00',
              price: '0000000000000000000000000000100000000000'
            }),
            genTrade('41f52283-00f8-451f-8382-6f790dd6d0b6', {
              offerId: '87c3a642-a194-42d3-a5f1-1c702dd294fe', tradeDate: '2021-02-01 00:00:00',
              price: '0000000000000000000000000000200000000000'
            }),
        ])
        .into(Trade)
        .execute();
};
