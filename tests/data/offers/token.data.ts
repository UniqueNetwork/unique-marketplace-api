import { SearchIndex } from '../../../src/entity';

export const prepareTokenData = async (queryBuilder) => {
  await queryBuilder
    .insert()
    .values([
      {
        id: "99b5888a-ed77-4c8b-acd4-9d549e8878b0",
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
        id: "7cd90ee0-a3fc-4593-9b71-33b402d4f487",
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
        id: "318fc190-2238-4bda-a6c0-2d686e4758f4",
        collection_id: 124,
        token_id: 1,
        network: "testnet",
        value: null,
        is_trait: false,
        locale: "en",
        items: ["Traits", "Workaholic Name", "Artyom Avdeev"],
        type: "String"
      },
      {
        id: "d5919e50-d076-4f68-b3d9-eb25d20d5d0a",
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
        id: "e23a14ef-444b-466d-8fed-e3b949e27b56",
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
        id: "d7d90953-9fd3-414a-9264-787da2d9c653",
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
        id: "d0107df1-11ea-428d-b2b9-d63e4df9d9be",
        collection_id: 124,
        token_id: 2,
        network: "testnet",
        value: null,
        is_trait: false,
        locale: "en",
        items: ["Traits", "Workaholic Name", "Zahar Aleksandrov"],
        type: "String"
      },
      {
        id: "42345ef3-da86-4abc-b0a9-4becfa8209c4",
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
        id: "7b01eabe-dd20-4b90-9535-81fa85590e95",
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
        id: "e24d6cc1-9268-4b35-9aae-82b852f45879",
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
        id: "27e7d082-b802-429c-b384-8017c4dd9b5c",
        collection_id: 124,
        token_id: 3,
        network: "testnet",
        value: null,
        is_trait: false,
        locale: "en",
        items: ["Traits", "Workaholic Name", "Aleksandr Aleksandrov"],
        type: "String"
      },
      {
        id: "40373bc9-4bf2-462a-bcc5-a4ed6f320438",
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
        id: "de77cab0-9c69-4b97-8130-8b9794d316f8",
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
        id: "c7e757a6-cb64-4b6e-9c8c-d1a896258527",
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
        id: "689516cb-8b31-440c-85a8-32fa49721327",
        collection_id: 124,
        token_id: 4,
        network: "testnet",
        value: null,
        is_trait: false,
        locale: "en",
        items: ["Traits", "Workaholic Name", "Iliya Alekseev"],
        type: "String"
      },
      {
        id: "e9f47cc1-1f9f-4eda-897b-fdafbce7189a",
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
        id: "ef2945a6-3b41-4c1a-bc05-0d4146ecb562",
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
        id: "09ade6e7-70b2-4e02-978b-79bb669d7bb2",
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
        id: "9276431b-c25f-48f2-b3ad-4692cdd5d0a3",
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
        id: "57804843-2629-452f-83b9-dcf56ca1e485",
        collection_id: 124,
        token_id: 5,
        network: "testnet",
        value: null,
        is_trait: false,
        locale: "en",
        items: ["Traits", "Workaholic Name", "Vsevolod Alekseev"],
        type: "String"
      },
      {
        id: "ac470132-702f-48bc-bbd5-76f7b11764f5",
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
        id: "f7fbbbf2-0aa5-4d6d-952b-2462d4addf3b",
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
        id: "d81814ff-027f-4922-8227-d945daf407f0",
        collection_id: 124,
        token_id: 6,
        network: "testnet",
        value: null,
        is_trait: false,
        locale: "en",
        items: ["Traits", "Workaholic Name", "Matvej Anisimov"],
        type: "String"
      },
      {
        id: "ab50675b-e218-49fd-bf5e-eda556d8c0cd",
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
        id: "606d9280-ec71-4d9d-8ff7-cb27472062db",
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
        id: "616ece20-ac1c-4e06-bbb1-c7f58c477c4b",
        collection_id: 562,
        token_id: 1,
        network: "testnet",
        value: null,
        is_trait: false,
        locale: null,
        items: [],
        type: "ImageURL"
      },
      {
        id: "68e0e08d-151c-4e89-a7f9-0d3e7962172d",
        collection_id: 562,
        token_id: 1,
        network: "testnet",
        value: null,
        is_trait: false,
        locale: "en",
        items: ["ipfsJson", "{\"ipfs\":\"QmcevbQN18BFoV9ZmvvTFjxjK81eRisob4o5cDYBUQb6YY\",\"type\":\"image\"}", "gender", "Male", "traits"],
        type: "String"
      },
      {
        id: "88dc3e5e-8c53-4dfa-9564-c4552aaf3ab7",
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
        id: "f5617619-6028-4e4a-9039-aa8a458dafab",
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
        id: "ce334fd6-027e-49ab-b4fd-eca64f0016b5",
        collection_id: 562,
        token_id: 2,
        network: "testnet",
        value: null,
        is_trait: false,
        locale: null,
        items: [],
        type: "ImageURL"
      },
      {
        id: "f67d395b-2bf3-4908-8d9a-8d574eda9612",
        collection_id: 562,
        token_id: 2,
        network: "testnet",
        value: null,
        is_trait: false,
        locale: "en",
        items: ["ipfsJson", "{\"ipfs\":\"QmSHb91HLoGr7AQivWCTvyTQxCsknE7Uu3Wt9NcMfmSRqz\",\"type\":\"image\"}", "gender", "Male", "traits"],
        type: "String"
      },
      {
        id: "fdd281b3-1584-4e3f-95d6-6e067ff6d1dc",
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
        id: "dc03ca45-c095-4677-b0d7-1179bdcd329b",
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
        id: "7737c1c1-014e-4f87-b06c-6e91f562f015",
        collection_id: 1782,
        token_id: 1,
        network: "testnet",
        value: null,
        is_trait: false,
        locale: null,
        items: [],
        type: "ImageURL"
      },
      {
        id: "b716969e-97fd-4295-bde1-29fa8be00981",
        collection_id: 1782,
        token_id: 1,
        network: "testnet",
        value: null,
        is_trait: false,
        locale: "en",
        items: [],
        type: "String"
      },
      {
        id: "b8c39519-08a1-414a-bdbe-7fbb1c3de17f",
        collection_id: 1782,
        token_id: 1,
        network: "testnet",
        value: null,
        is_trait: true,
        locale: "en",
        items: [],
        type: "Enum"
      },
      {
        id: "7e4852cd-89d8-48dc-93a3-e8370ad9e0dd",
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
        id: "29878e33-683f-4f85-80d7-181d9849a011",
        collection_id: 1782,
        token_id: 2,
        network: "testnet",
        value: null,
        is_trait: false,
        locale: null,
        items: [],
        type: "ImageURL"
      },
      {
        id: "fdf97a4e-2869-4289-8a5a-db079ab93afb",
        collection_id: 1782,
        token_id: 2,
        network: "testnet",
        value: null,
        is_trait: false,
        locale: "en",
        items: [],
        type: "String"
      },
      {
        id: "587a11ff-d391-4824-87f8-4c4703a52051",
        collection_id: 1782,
        token_id: 2,
        network: "testnet",
        value: null,
        is_trait: true,
        locale: "en",
        items: [],
        type: "Enum"
      },
      {
        id: "463c416f-bc95-46c1-854a-bf250e756e5b",
        collection_id: 1782,
        token_id: 3,
        network: "testnet",
        value: null,
        is_trait: false,
        locale: null,
        items: ["QTZY"],
        type: "Prefix"
      },
      {
        id: "003745e1-6ea4-4801-bfe0-2b14dafac491",
        collection_id: 1782,
        token_id: 3,
        network: "testnet",
        value: null,
        is_trait: false,
        locale: null,
        items: [],
        type: "ImageURL"
      },
      {
        id: "b5491bec-cd7f-4eb6-b4b3-1db07b839225",
        collection_id: 1782,
        token_id: 3,
        network: "testnet",
        value: null,
        is_trait: false,
        locale: "en",
        items: [],
        type: "String"
      },
      {
        id: "414a18fd-45aa-4dde-b94b-5f6a34e684f5",
        collection_id: 1782,
        token_id: 3,
        network: "testnet",
        value: null,
        is_trait: true,
        locale: "en",
        items: [],
        type: "Enum"
      }
    ])
    .into(SearchIndex)
    .execute()
}