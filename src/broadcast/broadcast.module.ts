import { Global, Module } from '@nestjs/common';

import { BroadcastWebSocketGateway } from './services/broadcast-websocket.gateway';
import { BroadcastService } from './services/broadcast.service';

@Global()
@Module({
  controllers: [],
  providers: [BroadcastWebSocketGateway, BroadcastService],
  exports: [BroadcastService],
})
export class BroadcastModule {}
