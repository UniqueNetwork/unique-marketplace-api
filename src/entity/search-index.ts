import { TypeAttributToken } from './../auction/types';
import { Column, Entity, Index } from 'typeorm';

@Index('IX_search_index_collection_id_token_id_locale', ['collection_id', 'token_id', 'locale'])
@Index('IX_search_index_list_items', ['list_items'])
@Index('IX_search_index_total_items', ['total_items'])
@Index('IX_search_index_key', ['key'])
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

  @Column('text', { name: 'items', array: true, default: [] })
  items: string[];

  @Column('boolean', { name: 'is_trait', default: "'f'" })
  is_trait: boolean;

  @Column('text', { name: 'locale', nullable: true })
  locale: string | null;

  @Column('varchar', { name: 'key', nullable: true, length: 200 })
  key: string | null;

  @Column('smallint', { name: 'count_item', nullable: true })
  count_item: number | null;

  @Column('smallint', { name: 'total_items', nullable: true })
  total_items: number | null;

  @Column('text', { name: 'list_items', array: true, default: [] })
  list_items: string[];

  @Column({
    type: 'enum',
    enum: TypeAttributToken,
    nullable: false,
    default: TypeAttributToken.String,
  })
  type: TypeAttributToken;
}
