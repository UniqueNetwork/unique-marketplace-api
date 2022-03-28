import { Injectable, Logger } from "@nestjs/common";
import {
  BroadcastIOServer,
  BroadcastIOSocket,
  TokenIds,
  BroadcastIOEmitter,
  isBroadcastIOServer
} from "../types";
import { OfferContractAskDto } from "../../offers/dto/offer-dto";

@Injectable()
export class BroadcastService {
  private readonly logger = new Logger(BroadcastService.name);

  private server: BroadcastIOServer | BroadcastIOEmitter = null;

  get isInitialized(): boolean {
    return this.server !== null;
  }

  init(emitter: BroadcastIOServer | BroadcastIOEmitter): void {
    if (isBroadcastIOServer(emitter)) {
      emitter.on('connection', this.handleSocketConnection.bind(this));
    }

    this.server = emitter;

    this.logger.debug(`initialised`);
  }

  private static getAuctionRoomId({ collectionId, tokenId }: TokenIds): string {
    return `auction-${collectionId}-${tokenId}`;
  }

  private handleSocketConnection(socket: BroadcastIOSocket): void {
    this.logger.debug(`Socket ${socket.id} connected`);

    socket.on('subscribeToAuction', async (ids) => {
      const roomId = BroadcastService.getAuctionRoomId(ids);

      this.logger.debug(`Socket ${socket.id} subscribeTo ${roomId}`);

      await socket.join(roomId);
    });

    socket.on('unsubscribeFromAuction', async (ids) => {
      const roomId = BroadcastService.getAuctionRoomId(ids);

      this.logger.debug(`Socket ${socket.id} unsubscribeFrom ${roomId}`)

      await socket.leave(roomId);
    });

    socket.on('disconnecting', (reason) => {
      this.logger.debug(`Socket ${socket.id} disconnecting; Reason ${reason}`)
    });

    socket.on('disconnect', (reason) => {
      this.logger.debug(`Socket ${socket.id} disconnected; Reason ${reason}`)
    });
  }

  sendAuctionStarted(offer: OfferContractAskDto): void {
    this.logger.debug(`auctionStarted - ${JSON.stringify(offer)}`);

    (this.server as BroadcastIOServer).of('/').emit('auctionStarted', offer);
  }

  sendBidPlaced(offer: OfferContractAskDto): void {
    const roomId = BroadcastService.getAuctionRoomId(offer);

    this.logger.debug(`bidPlaced - ${roomId} - ${JSON.stringify(offer)}`);

    this.server.in(roomId).emit('bidPlaced', offer);
  }

  sendAuctionClose(offer: OfferContractAskDto): void {
    const roomId = BroadcastService.getAuctionRoomId(offer);

    this.logger.debug(`auctionClosed - ${roomId} - ${JSON.stringify(offer)}`);

    this.server.in(roomId).emit('auctionClosed', offer);
  }
}