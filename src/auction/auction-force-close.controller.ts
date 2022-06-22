import { Controller, Delete, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ForceClosingService } from './services/closing/force-closing.service';

@ApiTags('Auction')
@Controller('auction')
export class AuctionForceCloseController {
  constructor(private readonly forceClosingService: ForceClosingService) {}

  @Delete('force_close_auction_for_test')
  async forceCloseAuctionForTest(@Query('collectionId') collectionId: string, @Query('tokenId') tokenId: string): Promise<void> {
    await this.forceClosingService.forceCloseAuction(collectionId, tokenId);
  }
}
