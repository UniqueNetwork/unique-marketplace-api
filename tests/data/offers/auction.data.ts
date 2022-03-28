import { AuctionEntity } from '../../../src/entity';

export const prepareAuctionData = async (queryBuilder) => {
  await queryBuilder
    .insert()
    .values([
      {
        id: "34cb1048-cb5d-4180-a7a7-07f532226374",
        createdAt: '2022-03-24 12:03:15.519000',
        updatedAt: '2022-03-24 12:03:15.519000',
        priceStep: '10',
        startPrice: '100',
        status: 'active',
        stopAt: '2022-12-24 14:03:15.519000',
        contractAskId: 'f047d7a5-1ba4-42c6-bac3-0dd9c2b6d13f'
      },
      {
        id: "ad14e93f-5abc-4f8d-b66b-1096e42cefcd",
        createdAt: '2022-03-24 12:03:15.519000',
        updatedAt: '2022-03-24 12:03:15.519000',
        priceStep: '10',
        startPrice: '100',
        status: 'active',
        stopAt: '2022-12-24 14:03:15.519000',
        contractAskId: '15d9ca2e-a84b-4884-b382-995d43232df9'
      },
      {
        id: "b0777f66-a7be-4685-a854-680adaecffef",
        createdAt: '2022-03-24 12:03:15.519000',
        updatedAt: '2022-03-24 12:03:15.519000',
        priceStep: '10',
        startPrice: '100',
        status: 'active',
        stopAt: '2022-12-24 14:03:15.519000',
        contractAskId: '15cdb536-6027-4559-8d48-164ce93a7c5f'
      },
      {
        id: "fda2ed25-a508-4a61-8ad4-7e914d7829c9",
        createdAt: '2022-03-24 12:03:15.519000',
        updatedAt: '2022-03-24 12:03:15.519000',
        priceStep: '10',
        startPrice: '100',
        status: 'active',
        stopAt: '2022-12-24 14:03:15.519000',
        contractAskId: 'dd63dce7-7a4d-4f07-bdb0-31dfb288222e'
      }
    ])
    .into(AuctionEntity)
    .execute()
}

