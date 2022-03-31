import { SearchIndex } from '../../../src/entity';

export const prepareTokenData = async (queryBuilder) => {
  await queryBuilder
    .insert()
    .values([
        {
          id: "28f0f5dc-bdda-4318-99ab-814b85bb718c",
          collection_id: 124,
          token_id: 1,
          network: "testnet",
          value: null,
          is_trait: false,
          locale: null,
          items: ["AAA"],
          type: "Prefix"
        },
        {
          id: "21f7f9e1-f17b-4bef-a5a1-d7a0f7aaaaec",
          collection_id: 124,
          token_id: 1,
          network: "testnet",
          value: null,
          is_trait: false,
          locale: null,
          items: ["http://ipfs-gateway.usetech.com/ipfs/Qmap7uz7JKZNovCdLfdDE3p4XA6shghdADS7EsHvLjL6jT/nft_image_1.png"],
          type: "ImageURL"
        },
        {
          id: "246d022e-6ce2-4355-b5c3-dc70d278ce31",
          collection_id: 124,
          token_id: 1,
          network: "testnet",
          value: null,
          is_trait: true,
          locale: "en",
          items: ["Regular Head", "Normal Eyes", "Greyish Brows", "Button Nose", "Messy Hair", "Wide Smile"],
          type: "Enum"
        },
        {
          id: "817f030f-c554-46a4-9b6c-e38ad4702ad0",
          collection_id: 124,
          token_id: 1,
          network: "testnet",
          value: null,
          is_trait: false,
          locale: null,
          items: ["Artyom Avdeev"],
          type: "String"
        },
        {
          id: "a89ee199-2433-4c80-ab19-0fd299bd80cb",
          collection_id: 124,
          token_id: 2,
          network: "testnet",
          value: null,
          is_trait: false,
          locale: null,
          items: ["AAA"],
          type: "Prefix"
        },
        {
          id: "de77e757-6315-40b4-907d-57e8a7b55bbb",
          collection_id: 124,
          token_id: 2,
          network: "testnet",
          value: null,
          is_trait: false,
          locale: null,
          items: ["http://ipfs-gateway.usetech.com/ipfs/Qmap7uz7JKZNovCdLfdDE3p4XA6shghdADS7EsHvLjL6jT/nft_image_2.png"],
          type: "ImageURL"
        },
        {
          id: "b7021a5b-e672-4c44-be86-b265d022f73f",
          collection_id: 124,
          token_id: 2,
          network: "testnet",
          value: null,
          is_trait: true,
          locale: "en",
          items: ["Regular Head", "Tired Eyes", "Flat Brows", "Droopy Nose", "Overdue for Haircut", "Smirk"],
          type: "Enum"
        },
        {
          id: "ed3f42d0-8ed1-4a21-b197-d3140e1e2cfb",
          collection_id: 124,
          token_id: 2,
          network: "testnet",
          value: null,
          is_trait: false,
          locale: null,
          items: ["Zahar Aleksandrov"],
          type: "String"
        },
        {
          id: "e990727a-8ae1-4dd9-a737-812bf9dbdbe3",
          collection_id: 124,
          token_id: 3,
          network: "testnet",
          value: null,
          is_trait: false,
          locale: null,
          items: ["AAA"],
          type: "Prefix"
        },
        {
          id: "aedf3a6d-7339-4efb-a9da-19933e56ac9f",
          collection_id: 124,
          token_id: 3,
          network: "testnet",
          value: null,
          is_trait: false,
          locale: null,
          items: ["http://ipfs-gateway.usetech.com/ipfs/Qmap7uz7JKZNovCdLfdDE3p4XA6shghdADS7EsHvLjL6jT/nft_image_3.png"],
          type: "ImageURL"
        },
        {
          id: "dcd75743-efeb-44ad-bb41-717f3bfabb4a",
          collection_id: 124,
          token_id: 3,
          network: "testnet",
          value: null,
          is_trait: true,
          locale: "en",
          items: ["Regular Head", "Tired Eyes", "Thick Brows", "Button Nose", "Messy Hair", "Wide Smile"],
          type: "Enum"
        },
        {
          id: "d575b8e9-b154-4750-823b-15853ac2d1e6",
          collection_id: 124,
          token_id: 3,
          network: "testnet",
          value: null,
          is_trait: false,
          locale: null,
          items: ["Aleksandr Aleksandrov"],
          type: "String"
        },
        {
          id: "4f9713ca-53b1-4cb1-8d7f-3c0c094d6964",
          collection_id: 124,
          token_id: 4,
          network: "testnet",
          value: null,
          is_trait: false,
          locale: null,
          items: ["AAA"],
          type: "Prefix"
        },
        {
          id: "a292c56a-719e-4b6e-ac61-91e69ac793fe",
          collection_id: 124,
          token_id: 4,
          network: "testnet",
          value: null,
          is_trait: false,
          locale: null,
          items: ["http://ipfs-gateway.usetech.com/ipfs/Qmap7uz7JKZNovCdLfdDE3p4XA6shghdADS7EsHvLjL6jT/nft_image_4.png"],
          type: "ImageURL"
        },
        {
          id: "4f86dda9-7cb6-4bdf-a139-7822d05c15ae",
          collection_id: 124,
          token_id: 4,
          network: "testnet",
          value: null,
          is_trait: true,
          locale: "en",
          items: ["Regular Head", "Brused Eyes", "Flat Brows", "Button Nose", "Hipster Style", "Regular Smile"],
          type: "Enum"
        },
        {
          id: "29f67256-cae5-4118-b352-08ce0193e577",
          collection_id: 124,
          token_id: 4,
          network: "testnet",
          value: null,
          is_trait: false,
          locale: null,
          items: ["Iliya Alekseev"],
          type: "String"
        },
        {
          id: "e7fd91a4-05de-4d01-8918-937b6c1d41fd",
          collection_id: 124,
          token_id: 5,
          network: "testnet",
          value: null,
          is_trait: false,
          locale: null,
          items: ["AAA"],
          type: "Prefix"
        },
        {
          id: "2eb9f839-5e7e-4e17-aeae-3ee83e2cbb31",
          collection_id: 124,
          token_id: 5,
          network: "testnet",
          value: null,
          is_trait: false,
          locale: null,
          items: ["http://ipfs-gateway.usetech.com/ipfs/Qmap7uz7JKZNovCdLfdDE3p4XA6shghdADS7EsHvLjL6jT/nft_image_5.png"],
          type: "ImageURL"
        },
        {
          id: "c2555ae9-787b-4391-bf1b-537292af4c19",
          collection_id: 124,
          token_id: 5,
          network: "testnet",
          value: null,
          is_trait: true,
          locale: "en",
          items: ["Regular Head", "Brused Eyes", "Greyish Brows", "Button Nose", "Normal Hair", "Regular Smile"],
          type: "Enum"
        },
        {
          id: "7c2c4d04-4420-4bcb-80b4-66542fb5ef86",
          collection_id: 124,
          token_id: 5,
          network: "testnet",
          value: null,
          is_trait: false,
          locale: null,
          items: ["Vsevolod Alekseev"],
          type: "String"
        },
        {
          id: "1da1db7a-9192-441c-8144-243fc3e67ebb",
          collection_id: 124,
          token_id: 6,
          network: "testnet",
          value: null,
          is_trait: false,
          locale: null,
          items: ["AAA"],
          type: "Prefix"
        },
        {
          id: "e1f1e4db-1876-49a0-bc71-ce05d471ac91",
          collection_id: 124,
          token_id: 6,
          network: "testnet",
          value: null,
          is_trait: false,
          locale: null,
          items: ["http://ipfs-gateway.usetech.com/ipfs/Qmap7uz7JKZNovCdLfdDE3p4XA6shghdADS7EsHvLjL6jT/nft_image_6.png"],
          type: "ImageURL"
        },
        {
          id: "1778ce7c-7ede-49b0-8e32-1b4e959ec30c",
          collection_id: 124,
          token_id: 6,
          network: "testnet",
          value: null,
          is_trait: true,
          locale: "en",
          items: ["Regular Head", "Normal Eyes", "Thick Brows", "Droopy Nose", "Overdue for Haircut", "Regular Smile"],
          type: "Enum"
        },
        {
          id: "47f81030-5eb0-426c-a697-d71802bdb79f",
          collection_id: 124,
          token_id: 6,
          network: "testnet",
          value: null,
          is_trait: false,
          locale: null,
          items: ["Matvej Anisimov"],
          type: "String"
        },
        {
          id: "654e7445-5d2b-4579-8098-3797aa1c7218",
          collection_id: 562,
          token_id: 1,
          network: "testnet",
          value: null,
          is_trait: false,
          locale: null,
          items: ["WORK"],
          type: "Prefix"
        },
        {
          id: "3a14f535-d242-4ce6-a2b0-235a8d16cf29",
          collection_id: 562,
          token_id: 1,
          network: "testnet",
          value: null,
          is_trait: false,
          locale: null,
          items: ["QmcevbQN18BFoV9ZmvvTFjxjK81eRisob4o5cDYBUQb6YY"],
          type: "ImageURL"
        },
        {
          id: "a79934a6-1bb5-4c6b-8c89-6b915189fd8d",
          collection_id: 562,
          token_id: 1,
          network: "testnet",
          value: null,
          is_trait: true,
          locale: "en",
          items: ["Male"],
          type: "Enum"
        },
        {
          id: "b762959b-9d30-4d72-9ecf-87544e5cdf31",
          collection_id: 562,
          token_id: 1,
          network: "testnet",
          value: null,
          is_trait: true,
          locale: "en",
          items: ["Teeth Smile", "Up Hair"],
          type: "Enum"
        },
        {
          id: "82a4e411-8a9c-4f1a-9530-9f947cea92f4",
          collection_id: 562,
          token_id: 2,
          network: "testnet",
          value: null,
          is_trait: false,
          locale: null,
          items: ["WORK"],
          type: "Prefix"
        },
        {
          id: "04979be5-f6b1-4f00-88e3-e52d0c8fd031",
          collection_id: 562,
          token_id: 2,
          network: "testnet",
          value: null,
          is_trait: false,
          locale: null,
          items: ["QmSHb91HLoGr7AQivWCTvyTQxCsknE7Uu3Wt9NcMfmSRqz"],
          type: "ImageURL"
        },
        {
          id: "c0a6b9e5-5298-48ce-bd7f-2ef0b20242ce",
          collection_id: 562,
          token_id: 2,
          network: "testnet",
          value: null,
          is_trait: true,
          locale: "en",
          items: ["Male"],
          type: "Enum"
        },
        {
          id: "12e8b5f4-18dd-4ce2-a175-d60628355199",
          collection_id: 562,
          token_id: 2,
          network: "testnet",
          value: null,
          is_trait: true,
          locale: "en",
          items: ["Smile", "Nose Ring", "Up Hair"],
          type: "Enum"
        },
        {
          id: "c3172ad6-e41c-4d3b-90b0-a254dda52b70",
          collection_id: 1782,
          token_id: 1,
          network: "testnet",
          value: null,
          is_trait: false,
          locale: null,
          items: ["QTZY"],
          type: "Prefix"
        },
        {
          id: "1fe3abf2-6a4f-485c-a9d3-7040cdacb826",
          collection_id: 1782,
          token_id: 2,
          network: "testnet",
          value: null,
          is_trait: false,
          locale: null,
          items: ["QTZY"],
          type: "Prefix"
        },
        {
          id: "3a0c4709-be8e-42d7-a2b3-15b714264596",
          collection_id: 1782,
          token_id: 3,
          network: "testnet",
          value: null,
          is_trait: false,
          locale: null,
          items: ["QTZY"],
          type: "Prefix"
        }
    ])
    .into(SearchIndex)
    .execute()
}