import {MigrationInterface, QueryRunner} from 'typeorm';
import {createSchema, dropSchema} from "./helpers";


export class Initial_20211106000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await createSchema(queryRunner);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await dropSchema(queryRunner);
  }

}