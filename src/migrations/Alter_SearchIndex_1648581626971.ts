import { TypeAttributToken } from '../auction/types';
import { SearchIndex } from '../entity';
import {MigrationInterface, QueryRunner} from "typeorm";

export class AlterSearchIndex1648581626971 implements MigrationInterface {
    name = 'AlterSearchIndex1648581626971'

    public async up(queryRunner: QueryRunner): Promise<void> {

      await queryRunner.query(`ALTER TABLE "search_index" ADD "items" text array NOT NULL DEFAULT '{}'`);
      await queryRunner.query(`CREATE TYPE "public"."search_index_type_enum" AS ENUM('ImageURL', 'Enum', 'String', 'Prefix')`);
      await queryRunner.query(`ALTER TABLE "search_index" ADD "type" "public"."search_index_type_enum" NOT NULL DEFAULT 'String'`);
      await queryRunner.query(`ALTER TABLE "search_index" ALTER COLUMN "value" DROP NOT NULL`);

      for (let searchItem of await queryRunner.query(`
      select collection_id, token_id, locale, array_agg(value) as item
from search_index
where token_id::text <> value
group by token_id, collection_id, locale
      `)) {
        await queryRunner.manager
        .createQueryBuilder()
        .update(SearchIndex)
        .set({
          type: ( searchItem.locale === 'en' ) ? TypeAttributToken.Enum : TypeAttributToken.String,
          items: searchItem.item,
          is_trait: (searchItem.locale === 'en') ? true : false
        })
        .where('collection_id = :collection_id ', {collection_id: searchItem.collection_id})
        .andWhere('token_id = :token_id', { token_id: searchItem.token_id })
        .execute();
      }

    }

    public async down(queryRunner: QueryRunner): Promise<void> {

      await queryRunner.query(`ALTER TABLE "search_index" ALTER COLUMN "value" SET NOT NULL`);
      await queryRunner.query(`ALTER TABLE "search_index" DROP COLUMN "type"`);
      await queryRunner.query(`DROP TYPE "public"."search_index_type_enum"`);
      await queryRunner.query(`ALTER TABLE "search_index" DROP COLUMN "items"`);
    }

}
