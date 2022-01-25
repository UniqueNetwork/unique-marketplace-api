import { createConnection } from 'typeorm';

import { ProjectNamingStrategy} from './naming_strategy';
import { Initial_20211106000000 } from "../migrations/initial_20211106";
import { MoveToEvm_20211220000000 } from "../migrations/move_to_evm_20211220";
import { auctionInit1643055195483 } from "../migrations/1643055195483-auction_init";

export const activeMigrations = [
  Initial_20211106000000,
  MoveToEvm_20211220000000,
  auctionInit1643055195483,
];

export const runMigrations = async (config) => {
  const connection = await createConnection({
    name: 'migrations', type: 'postgres', url: config.postgresUrl, logging: true, migrations: activeMigrations,
    namingStrategy: new ProjectNamingStrategy()
  });
  await connection.runMigrations();
  await connection.close();
}