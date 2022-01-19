import { ApiTags } from '@nestjs/swagger';
import { Controller, Get } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AuctionService } from './auction.service';

@ApiTags('Auction')
@Controller('auction')
export class AuctionController {
  constructor(
      private eventEmmiter: EventEmitter2,
      private auctionService: AuctionService,
    ) {}

    @Get('/:auctionId')
    getAuction(): Promise<any> {
      return null;
    }
}
