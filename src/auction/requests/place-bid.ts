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
import { KusamaApiTxDecodePipe } from "../pipes/tx-decode-pipe";
import { Type } from "class-transformer";
import { TxInfo } from "../types";

const balanceTransferExample = `0x450284001e9b0e86d2f6aa12ec6d55cbe40385260d9d82241b2414c788bcf221c7bb0d3e016625be208b9f805a1491e3c5a80e80b8a4990fc00dfb9c6d1e61e0971a725a5c99fc079bf22b2505994fba8a97df6f4c6a1cda44e87b1eacb44a452283e69282e50304000400000a91113393e01ebe11f932f89ccd2c3dd713aebbf4fde4d643e8873790477a070b00602f460214`;

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
  isSigned: true,
  signerAddress: string;
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
  @Equals(true, { message: 'tx must be signed'})
  isSigned: true;

  @IsString()
  @IsNotEmpty()
  signerAddress: string;

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
  KusamaApiTxDecodePipe,
  new ValidationPipe({ expectedType: BalanceTransferTxInfoDto }),
);
