import { Controller, Get, Inject, Param, ParseIntPipe, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { SearchIndexService } from './services/search-index.service';

@ApiTags('Search Index')
@Controller('search_index')
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

  @Post('update')
  async updateSearchIndex(): Promise<void> {
    await this.searchIndex.updateSearchIndex();
  }
}