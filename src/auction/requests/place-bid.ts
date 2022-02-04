import {
  Equals,
  IsDefined,
  IsNotEmpty,
  IsString,
  ValidateNested,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { OfferContractAskDto } from "../../offers/dto/offer-dto";
import { Body, ValidationPipe } from "@nestjs/common";
import { TxDecodePipe } from "../pipes/tx-decode-pipe";
import { Type } from "class-transformer";
import { TxInfo } from "../types";

const balanceTransferExample = `0x310284000a91113393e01ebe11f932f89ccd2c3dd713aebbf4fde4d643e8873790477a0701bea24a0dea49163bb9fcdaa0a23d1e6751be3ad9d7329dee13abfd57796e4435dd5234cae38b0b9ed38fb303b9c6a06d63ac15b8cce003525973b7a2ee47ee87c40000001e00005005b924a85aa096ed31f5ce56bcc9aff8e145335d6c7f65fb6c091784e28242250c`;

export type PlaceBidRequest = Pick<OfferContractAskDto, 'collectionId' | 'tokenId'> & { tx: string };

export class PlaceBidRequestDto implements PlaceBidRequest {
  @ApiProperty()
  collectionId: number;

  @ApiProperty()
  tokenId: number;

  @ApiProperty({ example: balanceTransferExample })
  @IsString()
  tx: string;
}

export interface BalanceTransferTxInfo extends TxInfo {
  address: string;
  method: 'transfer',
  section: 'balances';
  args: {
    dest: any;
    value: string;
  };
}

class BalanceTransferTxArgsDto {
  @IsDefined()
  dest: any;

  @IsString()
  @IsNotEmpty()
  value: string;
}

class BalanceTransferTxInfoDto implements BalanceTransferTxInfo {
  @IsString()
  @IsNotEmpty()
  address: string;

  @IsDefined()
  @ValidateNested()
  @Type(() => BalanceTransferTxArgsDto)
  args: BalanceTransferTxArgsDto;

  @Equals('transfer')
  method: "transfer";

  @Equals('balances')
  section: "balances";
}

export const DecodedBalanceTransfer = Body(
  'tx',
  TxDecodePipe,
  new ValidationPipe({ expectedType: BalanceTransferTxInfoDto }),
);
