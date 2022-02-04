import {
  Equals,
  IsDate, IsDefined, IsNotEmpty,
  IsString, ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty } from "@nestjs/swagger";
import { Auction, TxInfo } from "../types";
import { Body, ValidationPipe } from "@nestjs/common";
import { TxDecodePipe } from "../pipes/tx-decode-pipe";

const tokenTransferExample = `0x890284000a91113393e01ebe11f932f89ccd2c3dd713aebbf4fde4d643e8873790477a07015612fac581422d11fb6f3c5862f2b164046ba4208f7d13a0c5c09ae5d5794b76f856c2c2b5e2c98eca1291e57ed93189f39b018c55dd441c30cc80d36b2d1d86140000003d11009a0fdb82d88cb545207f4323e74c116aa961cc3403f5651ac9811888905f782b170000007b00000001000000000000000000000000000000`;

export type CreateAuctionRequest = Pick<Auction, 'startPrice' | 'priceStep' | 'stopAt'> & { tx: string };

export class CreateAuctionRequestDto implements CreateAuctionRequest {
  @ApiProperty()
  startPrice: string;

  @ApiProperty()
  priceStep: string;

  @ApiProperty()
  @Type(() => Date)
  @IsDate()
  stopAt: Date;

  @ApiProperty({ example: tokenTransferExample })
  @IsString()
  tx: string;
}

export interface TokenTransferTxInfo extends TxInfo {
  address: string;
  method: 'transfer',
  section: 'unique';
  args: {
    collection_id: string;
    item_id: string;
    recipient: any;
    value: '1',
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

class TokenTransferTxInfoDto implements TokenTransferTxInfo {
  @IsString()
  @IsNotEmpty()
  address: string;

  @IsDefined()
  @ValidateNested()
  @Type(() => TokenTransferTxArgsDto)
  args: TokenTransferTxArgsDto;

  @Equals('transfer')
  method: "transfer";

  @Equals('unique')
  section: "unique";
}

export const DecodedTokenTransfer = Body(
  'tx',
  TxDecodePipe,
  new ValidationPipe({ expectedType: TokenTransferTxInfoDto }),
);
