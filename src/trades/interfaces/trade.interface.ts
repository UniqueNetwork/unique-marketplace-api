export interface IMarketTrade {
    id: string;
    collection_id: string;
    token_id: string;
    network: string;
    price: string;
    currency: string;
    address_seller: string;
    address_buyer: string;
    ask_created_at: Date;
    buy_created_at: Date;
    block_number_ask: string;
    block_number_buy: string;
}
