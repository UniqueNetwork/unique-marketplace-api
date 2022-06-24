import { SearchIndex } from '../entity';
import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdatedSearchIndexListItems_2022062410550000 implements MigrationInterface {
  name = 'UpdatedSearchIndexListItems_2022062410550000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE INDEX "IX_search_index_total_items" ON "search_index" ("total_items") `);
    await queryRunner.query(`CREATE INDEX "IX_search_index_list_items" ON "search_index" ("list_items") `);

    for (const item of await queryRunner.query(
      `select collection_id, token_id
          from search_index
          group by rollup (collection_id, token_id)
          having collection_id is not null or token_id is not null`,
    )) {
      if (item.collection_id !== null && item.token_id !== null) {
        const listItems = await this.getListItems(queryRunner, item.collection_id, item.token_id);

        await queryRunner.manager
          .createQueryBuilder()
          .update(SearchIndex)
          .set({
            list_items: listItems,
          })
          .where('collection_id = :collection_id and token_id = :token_id', { collection_id: item.collection_id, token_id: item.token_id })
          .execute();
      }
    }
  }
  /**
   *
   * @param queryRunner
   * @param collectionId
   * @param tokenId
   */

  private async getListItems(queryRunner: QueryRunner, collectionId: number, tokenId: number): Promise<string[]> {
    const listItems = await queryRunner.query(
      `select array_agg(unnest_item) as list_items from ( ` +
        `select unnest(items) unnest_item ` +
        `from search_index ` +
        `where type in ('Enum', 'String') ` +
        `and key not in ('collectionCover', 'description', 'collectionName') ` +
        `and collection_id = ${collectionId} ` +
        `and token_id = ${tokenId}` +
        `) s`,
    );
    return listItems[0].list_items;
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "search_index" DROP COLUMN "list_items"`);

    await queryRunner.query(`DROP INDEX "public"."IX_search_index_list_items"`);
    await queryRunner.query(`DROP INDEX "public"."IX_search_index_total_items"`);
  }
}
