import { BadRequestException, Body, Controller, Delete, Headers, Post, Query, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { AuctionCreationService } from './services/auction-creation.service';
import { BidPlacingService } from './services/bid-placing.service';
import {
  CalculationInfoResponseDto,
  CalculationRequestDto,
  CancelAuctionQueryDto,
  CreateAuctionRequestDto,
  PlaceBidRequestDto,
  WithdrawBidQueryDto,
} from './requests';
import { OfferContractAskDto } from '../offers/dto/offer-dto';
import { TxDecoder } from './services/helpers/tx-decoder';
import { SignatureVerifier } from './services/helpers/signature-verifier';
import { AuctionCancellingService } from './services/auction-cancelling.service';
import { BidWithdrawService } from './services/bid-withdraw.service';

@ApiTags('Auction')
@Controller('auction')
export class AuctionController {
  constructor(
    private readonly auctionCreationService: AuctionCreationService,
    private readonly auctionCancellingService: AuctionCancellingService,
    private readonly bidPlacingService: BidPlacingService,
    private readonly bidWithdrawService: BidWithdrawService,
    private readonly txDecoder: TxDecoder,
    private readonly signatureVerifier: SignatureVerifier,
  ) {}

  @Post('create_auction')
  async createAuction(@Body() createAuctionRequest: CreateAuctionRequestDto): Promise<OfferContractAskDto> {
    const txInfo = await this.txDecoder.decodeUniqueTransfer(createAuctionRequest.tx);

    return await this.auctionCreationService.create({
      ...createAuctionRequest,
      collectionId: txInfo.args.collection_id,
      ownerAddress: txInfo.signerAddress,
      tokenId: txInfo.args.item_id,
    });
  }

  @Post('place_bid')
  async placeBid(@Body() placeBidRequest: PlaceBidRequestDto): Promise<OfferContractAskDto> {
    const txInfo = await this.txDecoder.decodeBalanceTransfer(placeBidRequest.tx);

    return await this.bidPlacingService.placeBid({
      ...placeBidRequest,
      bidderAddress: txInfo.signerAddress,
      amount: txInfo.args.value,
    });
  }

  @Post('calculate')
  async calculate(@Body() calculationRequest: CalculationRequestDto): Promise<CalculationInfoResponseDto> {
    const [calculationInfo] = await this.bidPlacingService.getCalculationInfo(calculationRequest);

    return CalculationInfoResponseDto.fromCalculationInfo(calculationInfo);
  }

  @Delete('cancel_auction')
  async cancelAuction(
    @Query() query: CancelAuctionQueryDto,
    @Headers('x-polkadot-signature') signature: string,
    @Headers('x-polkadot-signer') signerAddress: string,
    @Req() req: Request,
  ): Promise<OfferContractAskDto> {
    AuctionController.checkRequestTimestamp(query.timestamp);

    const queryString = req.originalUrl.split('?')[1];

    await this.signatureVerifier.verify({
      payload: queryString,
      signature,
      signerAddress,
    });

    return await this.auctionCancellingService.tryCancelAuction({
      collectionId: query.collectionId,
      tokenId: query.tokenId,
      ownerAddress: signerAddress,
    });
  }

  @Delete('withdraw_bid')
  async withdrawBid(
    @Query() query: WithdrawBidQueryDto,
    @Headers('x-polkadot-signature') signature: string,
    @Headers('x-polkadot-signer') signerAddress: string,
    @Req() req: Request,
  ): Promise<void> {
    AuctionController.checkRequestTimestamp(query.timestamp);

    const queryString = req.originalUrl.split('?')[1];

    await this.signatureVerifier.verify({
      payload: queryString,
      signature,
      signerAddress,
    });

    await this.bidWithdrawService.withdrawBidByBidder({
      collectionId: query.collectionId,
      tokenId: query.tokenId,
      bidderAddress: signerAddress,
    });
  }

  // todo - make custom validator?
  private static checkRequestTimestamp(timestamp: number): void {
    const maxShiftMinutes = 1;

    const shift = Math.abs(timestamp - Date.now());

    if (shift > maxShiftMinutes * 60 * 1000) {
      const shiftMinutes = (shift / (60 * 1000)).toFixed(2);

      const message = `Max request timestamp shift is ${maxShiftMinutes} minutes, current is ${shiftMinutes} minutes. Please send new request`;

      throw new BadRequestException(message);
    }
  }
}
