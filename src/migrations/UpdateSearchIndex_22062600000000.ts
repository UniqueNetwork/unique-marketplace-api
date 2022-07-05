import { SearchIndex } from '../entity';
import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateSearchIndex_22062600000000 implements MigrationInterface {
  name = 'UpdateSearchIndex_22062600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const item of await queryRunner.query(
      `select id, items, collection_id, token_id from search_index where type in ('Enum', 'String') and key not in ('collectionCover', 'description', 'collectionName')`,
    )) {
      const total = await this.getTotalItem(queryRunner, item.collection_id, item.token_id);

      await queryRunner.manager
        .createQueryBuilder()
        .update(SearchIndex)
        .set({
          count_item: item.items.length,
          total_items: total,
        })
        .where('id = :id', { id: item.id })
        .execute();
    }
  }

  private async getTotalItem(queryRunner: QueryRunner, collectionId: number, tokenId: number): Promise<number> {
    const total = await queryRunner.query(
      `select sum(array_length(items, 1)) as total from search_index where type in ('Enum', 'String') and key not in ('collectionCover', 'description', 'collectionName') and collection_id = ${collectionId} and token_id = ${tokenId}`,
    );
    return total[0].total;
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}
