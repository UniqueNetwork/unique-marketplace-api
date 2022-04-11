import { ApiPromise } from '@polkadot/api';
import { Controller, Get, Inject, Param, ParseIntPipe } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { SearchIndexService } from './services/search-index.service';

@ApiTags('Auction')
@Controller('auction')
export class SearchIndexController {
  constructor(
    private readonly searchIndex: SearchIndexService
  ) {}

  @Get('token-info/:collectionId/:tokenId')
  async getToken(
    @Param('collectionId', ParseIntPipe) collectionId: number,
    @Param('tokenId', ParseIntPipe) tokenId: number,
  ): Promise<any> {
    await this.searchIndex.addSearchIndexIfNotExists({
      collectionId, tokenId
    });
    return this.searchIndex.getTokenInfoItems({collectionId, tokenId});
  }
}