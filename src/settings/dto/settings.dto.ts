import { ApiProperty } from '@nestjs/swagger';
import { example } from 'yargs';

class SettingBlockchainUnique {
  @ApiProperty({})
  wsEndpoint: string;

  @ApiProperty({ example: [1, 5] })
  collectionIds: number[];

  @ApiProperty({})
  contractAddress: string;

  @ApiProperty({ example: { '1': [1, 30, 12], '5': [1, 2, 17] } })
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
  blockchain: SettingBlockchain;

  @ApiProperty({ required: false })
  auction?: Auction;
}
