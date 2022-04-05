import { MigrationInterface, QueryRunner  } from 'typeorm';
import { encodeAddress } from '@polkadot/util-crypto';
import { MarketTrade } from '../entity';

export class FixSubstrateAddressTrades_20220405000000 implements MigrationInterface {
  name = 'FixSubstrateAddressTrades_20220405000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    for (let trade of await queryRunner.query(`SELECT * FROM public."market_trade"`)) {
      await queryRunner.manager
        .createQueryBuilder()
        .update(MarketTrade)
        .set({
          address_seller: encodeAddress(trade.address_seller),
          address_buyer: encodeAddress(trade.address_buyer),
         })
        .where('id = :id', { id: trade.id })
        .execute();
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {}
}
