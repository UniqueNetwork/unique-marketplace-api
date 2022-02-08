import { ApiProperty } from '@nestjs/swagger';

class SettingBlockchainUnique {
    @ApiProperty({})
    wsEndpoint: string;

    @ApiProperty({ example: [13, 123] })
    collectionIds: number[];

    @ApiProperty({})
    contractAddress: string;
}

class SettingBlockchainKusama {
    @ApiProperty({})
    wsEndpoint: string;

    @ApiProperty({})
    marketCommission: string;
}

class SettingBlockchain {
    @ApiProperty({})
    escrowAddress: string;

    @ApiProperty({})
    unique: SettingBlockchainUnique;

    @ApiProperty({})
    kusama: SettingBlockchainKusama;
}

class Auction {
  @ApiProperty()
  address: string;

  @ApiProperty()
  commission: number;
}

export class SettingsDto {
    @ApiProperty({})
    blockchain: SettingBlockchain;

    @ApiProperty({ required: false })
    auction?: Auction;
}
