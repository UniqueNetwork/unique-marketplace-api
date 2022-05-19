import { Injectable, Logger } from "@nestjs/common";
import {
  BroadcastIOServer,
  BroadcastIOSocket,
  TokenIds,
  BroadcastIOEmitter,
} from "../types";
import { OfferContractAskDto } from "../../offers/dto/offer-dto";

@Injectable()
export class BroadcastService {
  private readonly logger = new Logger(BroadcastService.name);

  private server: BroadcastIOServer | BroadcastIOEmitter = null;

  get isInitialized(): boolean {
    return this.server !== null;
  }

  init(server: BroadcastIOServer | BroadcastIOEmitter, isServer = false): void {
    if (this.isInitialized) {
      this.logger.warn('already initialized, returning');
      return;
    }

    if (isServer) {
      (server as BroadcastIOServer).on('connection', this.handleSocketConnection.bind(this));
    }

    this.server = server;

    this.logger.debug(`Initialised by ${isServer ? 'BroadcastIOServer' : 'BroadcastIOEmitter'}`);
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
    this.logger.debug(`[Emit] auctionStarted - ${JSON.stringify(offer)}`);
    this.server.emit('auctionStarted', offer);
  }

  sendBidPlaced(offer: OfferContractAskDto): void {
    const roomId = BroadcastService.getAuctionRoomId(offer);

    this.logger.debug(`[Emit] bidPlaced - ${roomId} - ${JSON.stringify(offer)}`);

    this.server.in(roomId).emit('bidPlaced', offer);
  }

  sendAuctionStopped(offer: OfferContractAskDto): void {
    const roomId = BroadcastService.getAuctionRoomId(offer);

    this.logger.debug(`[Emit] auctionStopped - ${roomId} - ${JSON.stringify(offer)}`);

    this.server.in(roomId).emit('auctionStopped', offer);
  }

  sendAuctionClosed(offer: OfferContractAskDto): void {
    const roomId = BroadcastService.getAuctionRoomId(offer);

    this.logger.debug(`[Emit] auctionClosed - ${roomId} - ${JSON.stringify(offer)}`);

    this.server.in(roomId).emit('auctionClosed', offer);
  }
}