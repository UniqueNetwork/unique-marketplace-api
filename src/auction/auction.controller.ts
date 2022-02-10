import { Body, Controller, Delete, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { AuctionCreationService } from "./services/auction-creation.service";
import { BidPlacingService } from "./services/bid-placing.service";
import { CreateAuctionRequestDto, PlaceBidRequestDto } from "./requests";
import { OfferContractAskDto } from "../offers/dto/offer-dto";
import { WithdrawBidRequestDto } from "./requests/withdraw-bid";
import { TxDecoder } from "./services/tx-decoder";

@ApiTags('Auction')
@Controller('auction')
export class AuctionController {
  constructor(
    private readonly auctionCreationService: AuctionCreationService,
    private readonly bidPlacingService: BidPlacingService,
    private readonly txDecoder: TxDecoder,
  ) {}

  @Post('create_auction')
  async createAuction(
    @Body() createAuctionRequest: CreateAuctionRequestDto,
  ): Promise<OfferContractAskDto> {
    // todo - check that txInfo.args.recipient is market (auction) address

    const txInfo = await this.txDecoder.decodeUniqueTransfer(createAuctionRequest.tx);

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
  ): Promise<OfferContractAskDto> {
    // todo - check that txInfo.args.dest is market (auction) address
    const txInfo = await this.txDecoder.decodeBalanceTransfer(placeBidRequest.tx);

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
