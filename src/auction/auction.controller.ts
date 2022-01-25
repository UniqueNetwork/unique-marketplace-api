import { Body, Controller, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { CreateAuctionRequest, CreateAuctionResponse, PlaceBidRequest } from "./requests";
import { AuctionCreationService } from "./services/auction-creation.service";
import { PlaceBidResponse } from "./requests/place-bid";
import { BidPlacingService } from "./services/bid-placing.service";


@ApiTags('Auction')
@Controller('auction')
export class AuctionController {
  constructor(
    private readonly auctionCreationService: AuctionCreationService,
    private readonly bidPlacingService: BidPlacingService,
  ) {}

  @Post('create_auction')
  async createAuction(@Body() createAuctionRequest: CreateAuctionRequest): Promise<CreateAuctionResponse> {
    const { auction, nftTransferTransaction } = createAuctionRequest;

    return await this.auctionCreationService.create(auction, nftTransferTransaction)
  }

  @Post('place_bid')
  async placeBid(@Body() placeBidRequest: PlaceBidRequest): Promise<PlaceBidResponse> {
    const { bid, balanceTransferTransaction } = placeBidRequest;

    return await this.bidPlacingService.placeBid(bid, balanceTransferTransaction);
  }
}
