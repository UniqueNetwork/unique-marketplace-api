import { ApiProperty } from '@nestjs/swagger';
import { CalculateArgs, CalculationInfo } from '../types';
import { IsInt, IsString } from 'class-validator';

export class CalculationRequestDto implements CalculateArgs {
  @ApiProperty({ example: 1 })
  @IsInt()
  collectionId: number;

  @ApiProperty({ example: 1 })
  @IsInt()
  tokenId: number;

  @ApiProperty({ example: '5G4M7RCt8PvtFPFm4XSwu85eK9Z8n9c6rygHZawHVALUvgcd' })
  @IsString()
  bidderAddress: string;
}

type CalculationInfoResponse = Record<keyof CalculationInfo, string>;

export class CalculationInfoResponseDto implements CalculationInfoResponse {
  @ApiProperty()
  bidderPendingAmount: string;

  @ApiProperty()
  contractPendingPrice: string;

  @ApiProperty()
  priceStep: string;

  @ApiProperty()
  minBidderAmount: string;

  static fromCalculationInfo(calculationInfo: CalculationInfo): CalculationInfoResponseDto {
    return {
      contractPendingPrice: calculationInfo.contractPendingPrice.toString(),
      bidderPendingAmount: calculationInfo.bidderPendingAmount.toString(),
      minBidderAmount: calculationInfo.minBidderAmount.toString(),
      priceStep: calculationInfo.priceStep.toString(),
    };
  }
}
