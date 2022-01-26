import { Server, Socket } from "socket.io";
import { Auction, Bid } from "../../auction/types";

type ServerToClientEvents = {
  auctionStarted: (auction: Auction) => void;
  bidPlaced: (bid: Bid) => void;
};

type ClientToServerEvents = {
  subscribeToAuction: (auctionId: string) => void;
  unsubscribeFromAuction: (auctionId: string) => void;
};

type InterServerEvents = Record<string, never>;

type SocketData = Record<string, never>;

export type BroadcastIOServer = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>
export type BroadcastIOSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>