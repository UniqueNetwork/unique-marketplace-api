import { SearchIndexService } from "../../auction/services/search-index.service";
import { Connection } from "typeorm";
import { SearchIndex } from "../../entity";

export const main = async (moduleRef, args: string[]) => {

  const config = moduleRef.get('CONFIG', {strict: false});
  const connection: Connection = moduleRef.get('DATABASE_CONNECTION', {strict: false});
  const searchIndex = moduleRef.get(SearchIndexService, { strict: false });

  for (let index of await connection.query(`select collection_id, token_id from search_index
    group by collection_id, token_id`)) {
      console.log(JSON.stringify(index));

      await connection.createQueryBuilder()
      .delete()
      .from(SearchIndex)
      .where('collection_id = :collection_id', { collection_id: index.collection_id })
      .andWhere('token_id = :token_id', { token_id: index.token_id })
      .execute();

      await searchIndex.addSearchIndexIfNotExists({
        collectionId: index?.collection_id,
        tokenId: index?.token_id
      });
  }
}