import { Offer, TokenTextSearch } from '../../src/entity';
import { genOffer } from './base';

export const prepareSearchData = async (queryBuilder) => {
    await queryBuilder
        .insert()
        .values([
            genOffer('1b670fde-fa17-4a56-ab51-3af1a9ac893a', {
                collectionId: 23,
                tokenId: 120,
                price: '100000000000',
                creationDate: '2021-01-03 00:00:00',
            }),
            genOffer('3f1a6051-a162-41ad-8266-52568265c4df', {
                collectionId: 23,
                tokenId: 12,
                price: '200000000000',
                creationDate: '2021-01-01 00:00:00',
            }),
            genOffer('87c3a642-a194-42d3-a5f1-1c702dd294fe', {
                collectionId: 23,
                tokenId: 42,
                price: '300000000000',
                creationDate: '2021-01-02 00:00:00',
            }),
        ])
        .into(Offer)
        .execute();

    await queryBuilder
        .insert()
        .values([
            { id: '0b079d80-5044-42e7-b588-0ba65799984c', collectionId: 23, tokenId: 12, text: 'traits', locale: null },
            { id: 'bd553c15-f656-4f66-b108-864d220a5a18', collectionId: 23, tokenId: 12, text: 'Smile', locale: 'en' },
            {
                id: '67ecf97a-6711-426c-97bd-a312ccc73c84',
                collectionId: 23,
                tokenId: 12,
                text: 'Nose Ring',
                locale: 'en',
            },
            {
                id: 'ecfe2003-0ae5-4a94-9fe3-43077c4f6576',
                collectionId: 23,
                tokenId: 12,
                text: 'Left Earring',
                locale: 'en',
            },
            {
                id: 'e4e123b6-5c5c-47c9-b308-933a7670a9fa',
                collectionId: 23,
                tokenId: 12,
                text: 'Up Hair',
                locale: 'en',
            },
            { id: '7d167dd2-672d-4c15-85a9-3747624533a6', collectionId: 23, tokenId: 12, text: 'gender', locale: null },
            { id: '4eacf548-1618-4dca-a32e-26b4ed2b75e4', collectionId: 23, tokenId: 12, text: 'Male', locale: 'en' },
            { id: '4f0698b6-ac58-46c7-ad68-10cc56056ac7', collectionId: 23, tokenId: 12, text: '12', locale: null },
            { id: '05cfe276-b2ec-4b97-8de2-83600a2124bb', collectionId: 23, tokenId: 12, text: 'PNK', locale: null },
            { id: '4144c0bb-eec5-4e49-b132-e8cd22858118', collectionId: 23, tokenId: 42, text: 'traits', locale: null },
            { id: '4f839cd0-6762-4341-bd2b-ba04d0b8fd88', collectionId: 23, tokenId: 42, text: 'Smile', locale: 'en' },
            {
                id: '017dfccd-98d3-4d42-9de6-3be70cd0adf9',
                collectionId: 23,
                tokenId: 42,
                text: 'Asian Eyes',
                locale: 'en',
            },
            {
                id: '90c61cfa-61c7-46b8-a971-06bd07608605',
                collectionId: 23,
                tokenId: 42,
                text: 'Left Earring',
                locale: 'en',
            },
            {
                id: '55930297-1e8c-4596-9b67-4271fa2a5bda',
                collectionId: 23,
                tokenId: 42,
                text: 'Brown Beard',
                locale: 'en',
            },
            {
                id: 'd7b0ab0c-fe96-4c43-899b-faad4b5e5b95',
                collectionId: 23,
                tokenId: 42,
                text: 'Up Hair',
                locale: 'en',
            },
            { id: 'bd95eee9-57b9-474e-9626-b5e2776ef4e0', collectionId: 23, tokenId: 42, text: 'gender', locale: null },
            { id: '0e801cb1-4e70-4163-8aec-6cc7067c2301', collectionId: 23, tokenId: 42, text: 'Male', locale: 'en' },
            { id: 'f12ebc58-be2d-42e8-8278-bdb4635e4d36', collectionId: 23, tokenId: 42, text: '42', locale: null },
            { id: '0ddc43d9-4661-4ae8-8aa4-ff592ccc4ae5', collectionId: 23, tokenId: 42, text: 'PNK', locale: null },
            {
                id: '28a51f6a-42ba-4c06-977a-4c1081bac5b7',
                collectionId: 23,
                tokenId: 120,
                text: 'traits',
                locale: null,
            },
            { id: '7c2eeb89-1b79-4b0f-a080-3b207fcb1382', collectionId: 23, tokenId: 120, text: 'Smile', locale: 'en' },
            {
                id: '2ab27812-e63e-4943-856c-57b66e05673d',
                collectionId: 23,
                tokenId: 120,
                text: 'Nose Ring',
                locale: 'en',
            },
            {
                id: 'dda0bb93-a59b-47ca-92bc-52c069e3311c',
                collectionId: 23,
                tokenId: 120,
                text: 'Red Glasses',
                locale: 'en',
            },
            {
                id: '630f03f8-6e9d-4d37-bf1e-be86fbf33a51',
                collectionId: 23,
                tokenId: 120,
                text: 'Right Earring',
                locale: 'en',
            },
            {
                id: 'f89e0427-76b0-4bb9-abec-b5be2cff3268',
                collectionId: 23,
                tokenId: 120,
                text: 'Mustache Beard',
                locale: 'en',
            },
            {
                id: 'f686bdc0-9bb6-46ef-b5fa-9e7d052addb6',
                collectionId: 23,
                tokenId: 120,
                text: 'Up Hair',
                locale: 'en',
            },
            {
                id: '7866d927-ff3f-492d-94a6-6221e6e0de7d',
                collectionId: 23,
                tokenId: 120,
                text: 'gender',
                locale: null,
            },
            { id: 'ebbf4fc0-1cec-4ac8-862d-247c3c6a9971', collectionId: 23, tokenId: 120, text: 'Male', locale: 'en' },
            { id: '234a392d-a67b-4879-b614-e2530254d09c', collectionId: 23, tokenId: 120, text: '120', locale: null },
            { id: 'fb196cb5-b41e-4118-97ec-459433f3ee35', collectionId: 23, tokenId: 120, text: 'PNK', locale: null },
        ])
        .into(TokenTextSearch)
        .execute();
};
