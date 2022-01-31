import { Body, Controller, Delete, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { AuctionCreationService } from "./services/auction-creation.service";
import { BidPlacingService } from "./services/bid-placing.service";
import { CreateAuctionRequestDto, PlaceBidRequestDto } from "./requests";
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
  async createAuction(@Body() createAuctionRequest: CreateAuctionRequestDto): Promise<OfferContractAskDto> {
    return await this.auctionCreationService.create(createAuctionRequest);
  }

  @Post('place_bid')
  async placeBid(@Body() placeBidRequest: PlaceBidRequestDto): Promise<OfferContractAskDto> {
    return await this.bidPlacingService.placeBid(placeBidRequest);
  }

  @Delete('withdraw_bid')
  async withdrawBid(@Body() withdrawBidRequest: WithdrawBidRequestDto): Promise<void> {
    return await this.bidPlacingService.withdrawBid(withdrawBidRequest);
  }
}
