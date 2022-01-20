import { Column, Entity, Index } from 'typeorm';

@Index('IX_search_index_collection_id_token_id_locale', ['collection_id', 'token_id', 'locale'])
@Entity('search_index', { schema: 'public' })
export class SearchIndex {
    @Column('uuid', { primary: true, name: 'id' })
    id: string;

    @Column('bigint', { name: 'collection_id' })
    collection_id: string;

    @Column('bigint', { name: 'token_id' })
    token_id: string;

    @Column('varchar', { name: 'network', length: 16 })
    network: string;

    @Column('text', { name: 'value' })
    value: string;

    @Column('boolean', { name: 'is_trait', default: "'f'" })
    is_trait: boolean;

    @Column('text', { name: 'locale', nullable: true })
    locale: string | null;
}
