import { Body, Controller, Delete, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { AuctionCreationService } from "./services/auction-creation.service";
import { BidPlacingService } from "./services/bid-placing.service";
import {
  CreateAuctionRequestDto,
  DecodedTokenTransfer,
  TokenTransferTxInfo,
  PlaceBidRequestDto,
  DecodedBalanceTransfer,
  BalanceTransferTxInfo,
} from "./requests";
import { OfferContractAskDto } from "../offers/dto/offer-dto";
import { WithdrawBidRequestDto } from "./requests/withdraw-bid";

@ApiTags('Auction')
@Controller('auction')
export class AuctionController {
  constructor(
    private readonly auctionCreationService: AuctionCreationService,
    private readonly bidPlacingService: BidPlacingService,
  ) {}

  @Post('create_auction')
  async createAuction(
    @Body() createAuctionRequest: CreateAuctionRequestDto,
    @DecodedTokenTransfer txInfo: TokenTransferTxInfo,
  ): Promise<OfferContractAskDto> {
    // todo - check that txInfo.args.recipient is market (auction) address

    return await this.auctionCreationService.create({
      ...createAuctionRequest,
      collectionId: txInfo.args.collection_id,
      ownerAddress: txInfo.signerAddress,
      tokenId: txInfo.args.item_id,
    });
  }

  @Post('place_bid')
  async placeBid(
    @Body() placeBidRequest: PlaceBidRequestDto,
    @DecodedBalanceTransfer txInfo: BalanceTransferTxInfo,
  ): Promise<OfferContractAskDto> {
    // todo - check that txInfo.args.dest is market (auction) address

    return await this.bidPlacingService.placeBid({
      ...placeBidRequest,
      bidderAddress: txInfo.signerAddress,
      amount: txInfo.args.value,
    });
  }

  @Delete('withdraw_bid')
  async withdrawBid(@Body() withdrawBidRequest: WithdrawBidRequestDto): Promise<void> {
    return await this.bidPlacingService.withdrawBid(withdrawBidRequest);
  }
}
