import { Server, Socket } from "socket.io";
import { OfferContractAskDto } from "../../offers/dto/offer-dto";

export type ServerToClientEvents = {
  auctionStarted: (offer: OfferContractAskDto) => void;
  bidPlaced: (offer: OfferContractAskDto) => void;
  auctionClosed: (offer: OfferContractAskDto) => void;
};


export type TokenIds = { collectionId: number, tokenId: number };

export type ClientToServerEvents = {
  subscribeToAuction: (ids: TokenIds) => void;
  unsubscribeFromAuction: (ids: TokenIds) => void;
};

type InterServerEvents = Record<string, never>;

type SocketData = Record<string, never>;

export type BroadcastIOServer = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>
export type BroadcastIOSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>