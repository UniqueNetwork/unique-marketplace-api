import {
  Equals,
  IsDefined,
  IsNotEmpty,
  IsString,
  ValidateNested,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { OfferContractAskDto } from "../../offers/dto/offer-dto";
import { Type } from "class-transformer";
import { TxInfo } from "../types";

const balanceTransferExample = `0x450284001e9b0e86d2f6aa12ec6d55cbe40385260d9d82241b2414c788bcf221c7bb0d3e016625be208b9f805a1491e3c5a80e80b8a4990fc00dfb9c6d1e61e0971a725a5c99fc079bf22b2505994fba8a97df6f4c6a1cda44e87b1eacb44a452283e69282e50304000400000a91113393e01ebe11f932f89ccd2c3dd713aebbf4fde4d643e8873790477a070b00602f460214`;

export type PlaceBidRequest = Pick<OfferContractAskDto, 'collectionId' | 'tokenId'> & { tx: string };

export class PlaceBidRequestDto implements PlaceBidRequest {
  @ApiProperty({ example: 1 })
  collectionId: number;

  @ApiProperty({ example: 2 })
  tokenId: number;

  @ApiProperty({ example: balanceTransferExample })
  @IsString()
  tx: string;
}

export interface BalanceTransferTxInfo extends TxInfo {
  isSigned: true,
  signerAddress: string;
  method: 'transferKeepAlive',
  section: 'balances';
  args: {
    dest: any;
    value: string;
  };
}

class BalanceTransferTxArgsDto {
  @IsDefined()
  @IsString()
  dest: any;

  @IsString()
  @IsNotEmpty()
  value: string;
}

export class BalanceTransferTxInfoDto implements BalanceTransferTxInfo {
  @Equals(true, { message: 'tx must be signed'})
  isSigned: true;

  @IsString()
  @IsNotEmpty()
  signerAddress: string;

  @IsDefined()
  @ValidateNested()
  @Type(() => BalanceTransferTxArgsDto)
  args: BalanceTransferTxArgsDto;

  @Equals('transferKeepAlive')
  method: "transferKeepAlive";

  @Equals('balances')
  section: "balances";
}
