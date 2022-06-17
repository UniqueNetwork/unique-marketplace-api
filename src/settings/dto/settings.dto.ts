import { ApiProperty } from '@nestjs/swagger';

class SettingBlockchainUnique {
  @ApiProperty({})
  wsEndpoint: string;

  @ApiProperty({ example: [1, 5] })
  collectionIds: number[];

  @ApiProperty({})
  contractAddress: string;

  @ApiProperty({
    example: [
      { collection: 1, tokens: '1-15,37' },
      { collection: 2, tokens: '1,3,5,8,17-40' },
    ],
  })
  allowedTokens: string;
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
  marketType: string;
  @ApiProperty({})
  administrators: string[];
  @ApiProperty({})
  mainSaleSeedAddress: string;
  @ApiProperty({})
  blockchain: SettingBlockchain;

  @ApiProperty({ required: false })
  auction?: Auction;
}
