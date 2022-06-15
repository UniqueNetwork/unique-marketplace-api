import { Equals, IsIn, IsDefined, IsNotEmpty, IsString, ValidateNested, IsInt, Min, Max, IsOptional } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { TxInfo } from '../types';
import { IsBigInt, BigIntGte } from '../../offers/decorators/bigint';

const tokenTransferExample = `0x890284000a91113393e01ebe11f932f89ccd2c3dd713aebbf4fde4d643e8873790477a07015612fac581422d11fb6f3c5862f2b164046ba4208f7d13a0c5c09ae5d5794b76f856c2c2b5e2c98eca1291e57ed93189f39b018c55dd441c30cc80d36b2d1d86140000003d11009a0fdb82d88cb545207f4323e74c116aa961cc3403f5651ac9811888905f782b170000007b00000001000000000000000000000000000000`;

export type CreateAuctionRequest = {
  startPrice: bigint;
  priceStep: bigint;
  tx: string;
  days: number;
  minutes?: number;
};

const ToBigInt = Transform(({ value }: { value: any }): bigint | any => {
  try {
    return BigInt(value);
  } catch (error) {
    return value;
  }
});

export class CreateAuctionRequestDto implements CreateAuctionRequest {
  @ApiProperty({ example: '100' })
  @ToBigInt
  @IsBigInt()
  @BigIntGte(1n)
  startPrice: bigint;

  @ApiProperty({ example: '10' })
  @ToBigInt
  @IsBigInt()
  @BigIntGte(1n)
  priceStep: bigint;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(21)
  days: number;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(59)
  minutes: number;

  @ApiProperty({ example: tokenTransferExample })
  @IsString()
  tx: string;
}

export interface TokenTransferTxInfo extends TxInfo {
  isSigned: true;
  signerAddress: string;
  method: 'transfer' | 'transferFrom';
  section: 'unique';
  args: {
    collection_id: string;
    item_id: string;
    recipient: any;
    value: '1';
  };
}

class TokenTransferTxArgsDto {
  @IsDefined()
  recipient: any;

  @IsString()
  @IsNotEmpty()
  collection_id: string;

  @IsString()
  @IsNotEmpty()
  item_id: string;

  @Equals('1')
  value: '1';
}

export class TokenTransferTxInfoDto implements TokenTransferTxInfo {
  @Equals(true, { message: 'tx must be signed' })
  isSigned: true;

  @IsString()
  @IsNotEmpty()
  signerAddress: string;

  @IsDefined()
  @ValidateNested()
  @Type(() => TokenTransferTxArgsDto)
  args: TokenTransferTxArgsDto;

  @IsIn(['transfer', 'transferFrom'])
  method: 'transfer' | 'transferFrom';

  @Equals('unique')
  section: 'unique';
}
