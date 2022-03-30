import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { GatewayMetadata } from "@nestjs/websockets/interfaces/gateway-metadata.interface";

import { BroadcastService } from "./broadcast.service";
import { BroadcastIOServer } from "../types";

@WebSocketGateway({
  cors: { credentials: false },
} as GatewayMetadata)
export class BroadcastWebSocketGateway implements OnGatewayInit {
  @WebSocketServer()
  server: Server;

  constructor(private readonly webSocketService: BroadcastService) {}

  afterInit(server: BroadcastIOServer): void {
    this.webSocketService.init(server, true);
  }
}
