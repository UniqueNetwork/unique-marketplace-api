import { Bid } from "../../auction/types";

export interface BidInterface {
  bids: Array<Partial<Bid>>,
  winer(): Partial<Bid>,
  minting():Partial<Bid>,
  lose(): Array<Partial<Bid>>
}