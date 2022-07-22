import { Injectable, Logger } from '@nestjs/common';
import { cyan, black, bgGreen, bgRed } from 'cli-color';
import { BroadcastIOServer, BroadcastIOSocket, TokenIds, BroadcastIOEmitter } from '../types';
import { OfferEntityDto } from '../../offers/dto';

@Injectable()
export class BroadcastService {
  private readonly logger = new Logger(BroadcastService.name, { timestamp: true });
  private readonly emitColor = bgGreen(' ' + black('EMIT') + '');
  private readonly emitColorRed = bgRed(' ' + black('EMIT') + '');
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

    this.logger.log(`Initialised by ${isServer ? 'BroadcastIOServer' : 'BroadcastIOEmitter'}`);
  }

  private static getAuctionRoomId({ collectionId, tokenId }: TokenIds): string {
    return `auction-${collectionId}-${tokenId}`;
  }

  private handleSocketConnection(socket: BroadcastIOSocket): void {
    this.logger.log(cyan(`User ${socket.id} connected`));

    socket.on('subscribeToAuction', async (ids) => {
      const roomId = BroadcastService.getAuctionRoomId(ids);
      this.logger.log(cyan(`User ${socket.id} subscribeTo ${roomId}`));
      await socket.join(roomId);
    });

    socket.on('unsubscribeFromAuction', async (ids) => {
      const roomId = BroadcastService.getAuctionRoomId(ids);
      this.logger.log(cyan(`User ${socket.id} unsubscribeFrom ${roomId}`));
      await socket.leave(roomId);
    });

    socket.on('disconnecting', (reason) => {
      this.logger.warn(cyan(`User ${socket.id} disconnecting; Reason ${reason}`));
    });

    socket.on('disconnect', (reason) => {
      this.logger.warn(cyan(`User ${socket.id} disconnected; Reason ${reason}`));
    });
  }

  sendAuctionStarted(offer: OfferEntityDto): void {
    this.logger.log(`${this.emitColor} auctionStarted - ${JSON.stringify(offer)}`);
    this.server.emit('auctionStarted', offer);
  }

  sendBidPlaced(offer: OfferEntityDto): void {
    const roomId = BroadcastService.getAuctionRoomId(offer);

    this.logger.log(`${this.emitColor} bidPlaced - ${roomId} - ${JSON.stringify(offer)}`);

    this.server.in(roomId).emit('bidPlaced', offer);
  }

  sendAuctionError(offer: OfferEntityDto, message: string): void {
    const roomId = BroadcastService.getAuctionRoomId(offer);
    this.logger.error(`${this.emitColorRed} errorMessage - ${roomId} - ${JSON.stringify(offer)}`);
    const error = {
      offer: JSON.stringify(offer),
      message,
    };
    this.server.in(roomId).emit('errorMessage', `${error}`);
  }

  sendAuctionStopped(offer: OfferEntityDto): void {
    const roomId = BroadcastService.getAuctionRoomId(offer);

    this.logger.debug(`${this.emitColorRed} auctionStopped - ${roomId} - ${JSON.stringify(offer)}`);

    this.server.in(roomId).emit('auctionStopped', offer);
  }

  sendAuctionClosed(offer: OfferEntityDto): void {
    const roomId = BroadcastService.getAuctionRoomId(offer);

    this.logger.debug(`${this.emitColorRed} auctionClosed - ${roomId} - ${JSON.stringify(offer)}`);

    this.server.in(roomId).emit('auctionClosed', offer);
  }
}
