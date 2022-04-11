import { MigrationInterface, QueryRunner, Table } from 'typeorm';
import { encodeAddress, decodeAddress } from '@polkadot/util-crypto';
import { ContractAsk } from '../entity';

export class FixSubstrateAddressOffers_20220325000000 implements MigrationInterface {
  name = 'FixSubstrateAddressOffers_20220325000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    for (let offers of await queryRunner.query(`SELECT * FROM public."contract_ask"`)) {
      await queryRunner.manager
        .createQueryBuilder()
        .update(ContractAsk)
        .set({ address_from: encodeAddress(offers.address_from) })
        .where('id = :id', { id: offers.id })
        .execute();
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {}
}
