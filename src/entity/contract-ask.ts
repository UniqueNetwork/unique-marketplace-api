import { Column, Entity, Index, OneToOne } from 'typeorm';
import { BlockchainBlock } from './blockchain-block';
import { AuctionEntity } from "../auction/entities";
import { SearchIndex } from './search-index';

@Index('IX_contract_ask_collection_id_token_id', ['collection_id', 'token_id'])
@Index('IX_contract_ask_status', ['status'])
@Entity('contract_ask', { schema: 'public' })
export class ContractAsk {
    @Column('uuid', { primary: true, name: 'id' })
    id: string;

    @Column('varchar', { name: 'status', length: 16 })
    status: string;

    @Column('bigint', { name: 'collection_id' })
    collection_id: string;

    @Column('bigint', { name: 'token_id' })
    token_id: string;

    @Column('varchar', { name: 'network', length: 16 })
    network: string;

    @Column('bigint', { name: 'price' })
    price: string;

    @Column('varchar', { name: 'currency', length: 64 })
    currency: string;

    @Column('varchar', { name: 'address_from', length: 128 })
    address_from: string;

    @Column('varchar', { name: 'address_to', length: 128 })
    address_to: string;

    @Column('bigint', { name: 'block_number_ask' })
    block_number_ask: string;

    @Column('bigint', { name: 'block_number_cancel', nullable: true })
    block_number_cancel: string;

    @Column('bigint', { name: 'block_number_buy', nullable: true })
    block_number_buy: string;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', name: 'created_at_ask', })
    created_at_ask: Date;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP', name: 'updated_at', })
    updated_at: Date;

    @OneToOne((type) => BlockchainBlock, (BlockchainBlock) => BlockchainBlock.network)
    created_at: Date;

    @OneToOne(() => AuctionEntity, (auction) => auction.contractAsk, { cascade: ['insert']})
    auction?: AuctionEntity;
    @OneToOne((type) => BlockchainBlock)
    block: BlockchainBlock;
    @OneToOne((type) => SearchIndex)
    search_index: SearchIndex;
}
