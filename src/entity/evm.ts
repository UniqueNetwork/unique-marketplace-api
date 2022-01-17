import { Column, Entity, Index } from 'typeorm';

@Index("PK_blockchain_block", ["block_number", "network"], { unique: true })
@Entity("blockchain_block", { schema: "public" })
export class BlockchainBlock {
  @Column("bigint", {
    primary: true,
    name: "block_number"
  })
  block_number: string;

  @Column("varchar", {primary: true, name: "network", length: 16})
  network: string;

  @Column("timestamp without time zone", { name: "created_at" })
  created_at: Date;
}


@Index("IX_nft_transfer_collection_id_token_id", ["collection_id", "token_id"])
@Index("IX_nft_transfer_network_block_number", ["network", "block_number"])
@Entity("nft_transfer", { schema: "public" })
export class NFTTransfer {
  @Column("uuid", { primary: true, name: "id" })
  id: string;

  @Column("bigint", {name: "collection_id"})
  collection_id: string;

  @Column("bigint", {name: "token_id"})
  token_id: string;

  @Column("varchar", {name: "network", length: 16})
  network: string;

  @Column("varchar", {name: "address_from", length: 128})
  address_from: string;

  @Column("varchar", {name: "address_to", length: 128})
  address_to: string;

  @Column("bigint", {name: "block_number"})
  block_number: string;
}


@Index("IX_money_transfer_currency_type_status", ["currency", "type", "status"])
@Entity("money_transfer", { schema: "public" })
export class MoneyTransfer {
  @Column("uuid", { primary: true, name: "id" })
  id: string;

  @Column("varchar", {name: "currency", length: 64})
  currency: string;

  @Column("varchar", {name: "type", length: 32})
  type: string;

  @Column("varchar", {name: "status", length: 32})
  status: string;

  @Column("bigint", {name: "amount"})
  amount: string;

  @Column("varchar", {name: "network", length: 16})
  network: string;

  @Column("bigint", {name: "block_number"})
  block_number: string;

  @Column("timestamp without time zone", {name: "created_at"})
  created_at: Date;

  @Column("timestamp without time zone", {name: "updated_at"})
  updated_at: Date;

  @Column("jsonb", {name: "extra", nullable: true})
  extra: any;
}


@Index("IX_contract_ask_collection_id_token_id", ["collection_id", "token_id"])
@Index("IX_contract_ask_status", ["status"])
@Entity("contract_ask", { schema: "public" })
export class ContractAsk {
  @Column("uuid", { primary: true, name: "id" })
  id: string;

  @Column("varchar", {name: "status", length: 16})
  status: string;

  @Column("bigint", {name: "collection_id"})
  collection_id: string;

  @Column("bigint", {name: "token_id"})
  token_id: string;

  @Column("varchar", {name: "network", length: 16})
  network: string;

  @Column("bigint", {name: "price"})
  price: string;

  @Column("varchar", {name: "currency", length: 64})
  currency: string;

  @Column("varchar", {name: "address_from", length: 128})
  address_from: string;

  @Column("varchar", {name: "address_to", length: 128})
  address_to: string;

  @Column("bigint", {name: "block_number_ask"})
  block_number_ask: string;

  @Column("bigint", {name: "block_number_cancel", nullable: true})
  block_number_cancel: string;

  @Column("bigint", {name: "block_number_buy", nullable: true})
  block_number_buy: string;
}


@Index("IX_search_index_collection_id_token_id_locale", ["collection_id", "token_id", "locale"])
@Entity("search_index", {schema: "public"})
export class SearchIndex {
  @Column("uuid", { primary: true, name: "id" })
  id: string;

  @Column("bigint", {name: "collection_id"})
  collection_id: string;

  @Column("bigint", {name: "token_id"})
  token_id: string;

  @Column("varchar", {name: "network", length: 16})
  network: string;

  @Column("text", {name: "value"})
  value: string;

  @Column("boolean", {name: "is_trait", default: "'f'"})
  is_trait: boolean;

  @Column("text", {name: "locale", nullable: true})
  locale: string | null;
}

@Entity("market_trade", {schema: "public"})
export class MarketTrade {
  @Column("uuid", { primary: true, name: "id" })
  id: string;

  @Column("bigint", {name: "collection_id"})
  collection_id: string;

  @Column("bigint", {name: "token_id"})
  token_id: string;

  @Column("varchar", {name: "network", length: 16})
  network: string;

  @Column("bigint", {name: "price"})
  price: string;

  @Column("varchar", {name: "currency", length: 64})
  currency: string;

  @Column("varchar", {name: "address_seller", length: 128})
  address_seller: string;

  @Column("varchar", {name: "address_buyer", length: 128})
  address_buyer: string;

  @Column("timestamp without time zone", { name: "ask_created_at" })
  ask_created_at: Date;

  @Column("timestamp without time zone", { name: "buy_created_at" })
  buy_created_at: Date;

  @Column("bigint", {name: "block_number_ask", nullable: true})
  block_number_ask: string;

  @Column("bigint", {name: "block_number_buy", nullable: true})
  block_number_buy: string;
}


@Entity("account_pairs", {schema: "public"})
export class AccountPairs {
  @Column("varchar", {name: "substrate", length: 128, primary: true})
  substrate: string;

  @Column("varchar", {name: "ethereum", length: 128, primary: true})
  ethereum: string;
}
