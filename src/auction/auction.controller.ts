import { ApiPromise } from '@polkadot/api';
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Inject, Logger,
  Post,
  Query,
  Req,
  UseInterceptors,
  ValidationPipe,
} from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { convertAddress } from '../utils/blockchain/util';
import { AuctionCreationService } from './services/auction-creation.service';
import { BidPlacingService } from './services/bid-placing.service';
import {
  CalculationInfoResponseDto,
  CalculationRequestDto,
  CancelAuctionQueryDto,
  CreateAuctionRequestDto,
  OwnerWithdrawBidQueryDto,
  PlaceBidRequestDto,
  WithdrawBidChosenQueryDto,
  WithdrawBidQueryDto,
} from './requests';
import { OfferContractAskDto } from '../offers/dto/offer-dto';
import { TxDecoder } from './services/helpers/tx-decoder';
import { SignatureVerifier } from './services/helpers/signature-verifier';
import { AuctionCancelingService } from './services/auction-canceling.service';
import { BidWithdrawService } from './services/bid-withdraw.service';
import { TraceInterceptor } from "../utils/sentry";
import { BidsWitdrawByOwnerDto } from './responses';
import * as fs from 'fs';

const WithSignature = ApiHeader({
  name: 'Authorization',
  allowEmptyValue: false,
  example: 'address:signature',
  description: 'address:signature',
});

@ApiTags('Auction')
@Controller('auction')
@UseInterceptors(TraceInterceptor)
export class AuctionController {
  private logger: Logger;
  constructor(
    private readonly auctionCreationService: AuctionCreationService,
    private readonly auctionCancellingService: AuctionCancelingService,
    private readonly bidPlacingService: BidPlacingService,
    private readonly bidWithdrawService: BidWithdrawService,
    private readonly txDecoder: TxDecoder,
    private readonly signatureVerifier: SignatureVerifier,
    @Inject('KUSAMA_API') private kusamaApi: ApiPromise,
    @Inject('UNIQUE_API') private uniqueApi: ApiPromise,
  ) {
    this.logger = new Logger(AuctionController.name)
  }

  @Post('create_auction')
  @ApiOperation({
    summary: 'Create an auction',
    description: fs.readFileSync('docs/create_auction.md').toString(),
  })
  @ApiResponse({ type: OfferContractAskDto })
  async createAuction(@Body(new ValidationPipe({ transform: true })) createAuctionRequest: CreateAuctionRequestDto): Promise<OfferContractAskDto> {
    try {
      const txInfo = await this.txDecoder.decodeUniqueTransfer(createAuctionRequest.tx);

      this.logger.debug(`Create an auction - collectionId: ${txInfo.args.collection_id},ownerAddress: ${txInfo.signerAddress}, tokenId: ${txInfo.args.item_id}`)
      return await this.auctionCreationService.create({
        ...createAuctionRequest,
        collectionId: txInfo.args.collection_id,
        ownerAddress: txInfo.signerAddress,
        tokenId: txInfo.args.item_id,
      });
    } catch (error) {

      await this.auctionCreationService.saveFailedAuction(createAuctionRequest);

      throw new BadRequestException(error.message);
    }
  }

  @Post('place_bid')
  @ApiResponse({ type: OfferContractAskDto })
  @ApiOperation({
    summary: 'Placing a bid in an auction',
    description: fs.readFileSync('docs/place_bid_auction.md').toString(),
  })
  async placeBid(@Body() placeBidRequest: PlaceBidRequestDto): Promise<OfferContractAskDto> {
    const txInfo = await this.txDecoder.decodeBalanceTransfer(placeBidRequest.tx);

    return await this.bidPlacingService.placeBid({
      ...placeBidRequest,
      bidderAddress: txInfo.signerAddress,
      amount: txInfo.args.value,
    });
  }

  @Post('calculate')
  @ApiResponse({ type: CalculationInfoResponseDto })
  @ApiOperation({
    summary: 'Calculation',
    description: fs.readFileSync('docs/calculation.md').toString(),
  })
  async calculate(@Body() calculationRequest: CalculationRequestDto): Promise<CalculationInfoResponseDto> {
    try {
      const bidderAddress = await convertAddress(calculationRequest.bidderAddress, this.kusamaApi.registry.chainSS58);

      const [calculationInfo] = await this.bidPlacingService.getCalculationInfo({ ...calculationRequest, bidderAddress });

      return CalculationInfoResponseDto.fromCalculationInfo(calculationInfo);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Delete('cancel_auction')
  @ApiResponse({ type: OfferContractAskDto })
  @ApiOperation({
    summary: 'Canceled an auction',
    description: fs.readFileSync('docs/cancel_auction.md').toString(),
  })
  @WithSignature
  async cancelAuction(
    @Query() query: CancelAuctionQueryDto,
    @Headers('Authorization') authorization = '',
    @Req() req: Request,
  ): Promise<OfferContractAskDto> {
    AuctionController.checkRequestTimestamp(query.timestamp);
    const [signerAddress = '', signature = ''] = authorization.split(':');
    const queryString = req.originalUrl.split('?')[1];

    await this.signatureVerifier.verify({
      payload: queryString,
      signature,
      signerAddress,
    });

    const ownerAddress = await convertAddress(signerAddress, this.uniqueApi.registry.chainSS58);
    this.logger.debug
    return await this.auctionCancellingService.tryCancelAuction({
      collectionId: query.collectionId,
      tokenId: query.tokenId,
      ownerAddress,
    });
  }

  @Delete('withdraw_bid')
  @ApiOperation({
    summary: 'Withdraw bid',
    description: fs.readFileSync('docs/withdraw_bid.md').toString(),
  })
  @WithSignature
  async withdrawBid(@Query() query: WithdrawBidQueryDto, @Headers('Authorization') authorization = '', @Req() req: Request): Promise<void> {
    AuctionController.checkRequestTimestamp(query.timestamp);
    const [signerAddress = '', signature = ''] = authorization.split(':');
    const queryString = req.originalUrl.split('?')[1];

    await this.signatureVerifier.verify({
      payload: queryString,
      signature,
      signerAddress,
    });

    const bidderAddress = await convertAddress(signerAddress, this.kusamaApi.registry.chainSS58);

    await this.bidWithdrawService.withdrawBidByBidder({
      collectionId: query.collectionId,
      tokenId: query.tokenId,
      bidderAddress,
    });
  }

  @Get('withdraw_bids')
  @ApiOperation({
    summary: 'Get bids',
    description: fs.readFileSync('docs/list_withdraw_bid.md').toString(),
  })
  async getTokenWithdrawBid(@Query() query: OwnerWithdrawBidQueryDto): Promise<BidsWitdrawByOwnerDto> {
    return this.bidWithdrawService.getBidsForWithdraw(query.owner);
  }

  @Delete('withdraw_choose_bid')
  @ApiOperation({
    summary: 'Withdraw choose bid',
    description: fs.readFileSync('docs/withdraw_choose_bid.md').toString(),
  })
  @WithSignature
  async withdrawChooseBid(@Query() query: WithdrawBidChosenQueryDto, @Headers('Authorization') authorization = '', @Req() req: Request): Promise<void> {
    AuctionController.checkRequestTimestamp(query.timestamp);
    const [signerAddress = '', signature = ''] = authorization.split(':');
    const queryString = req.originalUrl.split('?')[1];

    await this.signatureVerifier.verify({
      payload: queryString,
      signature,
      signerAddress,
    });

    const bidderAddress = await convertAddress(signerAddress, this.kusamaApi.registry.chainSS58);

    await this.bidWithdrawService.withdrawBidsByBidder({
      bidderAddress,
      auctionIds: Array.isArray(query.auctionId) ? query.auctionId : [query.auctionId]
    });
  }

  // todo - make custom validator?
  private static checkRequestTimestamp(timestamp: number): void {
    const maxShiftMinutes = 10;

    const shift = Math.abs(timestamp - Date.now());

    if (shift > maxShiftMinutes * 60 * 1000) {
      const shiftMinutes = (shift / (60 * 1000)).toFixed(2);

      const message = `Max request timestamp shift is ${maxShiftMinutes} minutes, current is ${shiftMinutes} minutes. Please send new request`;

      throw new BadRequestException(message);
    }
  }
}
