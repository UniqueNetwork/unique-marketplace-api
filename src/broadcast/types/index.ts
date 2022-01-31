import { Server, Socket } from "socket.io";
import { OfferContractAskDto } from "../../offers/dto/offer-dto";

type ServerToClientEvents = {
  auctionStarted: (offer: OfferContractAskDto) => void;
  bidPlaced: (offer: OfferContractAskDto) => void;
};

type ClientToServerEvents = {
  subscribeToAuction: (offerId: string) => void;
  unsubscribeFromAuction: (offerId: string) => void;
};

type InterServerEvents = Record<string, never>;

type SocketData = Record<string, never>;

export type BroadcastIOServer = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>
export type BroadcastIOSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>