import { ViewColumn, ViewEntity } from 'typeorm';

@ViewEntity({
  expression: `select _auc.id, _auc.created_at, _auc.updated_at, _auc.price_step, _auc.start_price, _auc.status, _auc.stop_at, _auc.contract_ask_id, _bid.bidder_address
  from auctions _auc
  left join bids _bid on _auc.id = _bid.auction_id
  where _auc.status not in ('failed', 'ended') and _bid.amount > 0`,
  name: 'v_auction_bids',
})
export class AuctionBids {
  @ViewColumn({ name: 'id' })
  id: string;

  @ViewColumn({ name: 'created_at' })
  createdAt: Date;

  @ViewColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ViewColumn({ name: 'price_step' })
  priceStep: string;

  @ViewColumn({ name: 'start_price' })
  startPrice: string;

  @ViewColumn({ name: 'status' })
  status: string; // AuctionStatus

  @ViewColumn({ name: 'stop_at' })
  stopAt: Date;

  @ViewColumn({ name: 'contract_ask_id' })
  contractAskId: string;

  @ViewColumn({ name: 'bidder_address' })
  bidderAddress: string;
}
