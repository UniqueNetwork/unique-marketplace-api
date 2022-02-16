import { Bid } from "../types";

export interface BidInterface {
  bids: Array<Partial<Bid>>,
  winer(): Partial<Bid>,
  lose(): Array<Partial<Bid>>
}