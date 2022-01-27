import { ApiProperty } from '@nestjs/swagger';

export class SettingBlockchainUnique {
    @ApiProperty({})
    wsEndpoint: string;

    @ApiProperty({ example: [13, 123] })
    collectionIds: number[];

    @ApiProperty({})
    contractAddress: string;
}

export class SettingBlockchainKusama {
    @ApiProperty({})
    wsEndpoint: string;

    @ApiProperty({})
    marketCommission: string;
}

export class SettingBlockchainEscrow {
    @ApiProperty({})
    adress: string;
}

export class SettingBlockchain {
    @ApiProperty({})
    unique: SettingBlockchainUnique;

    @ApiProperty({})
    kusama: SettingBlockchainKusama;
}

export class SettingsDto {
    @ApiProperty({})
    blockchain: SettingBlockchain;
}
