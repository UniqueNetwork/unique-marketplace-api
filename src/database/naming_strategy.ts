import { DefaultNamingStrategy, NamingStrategyInterface, Table } from 'typeorm';

export class ProjectNamingStrategy extends DefaultNamingStrategy implements NamingStrategyInterface {
  primaryKeyName(tableOrName: Table | string): string {
    const tableName = tableOrName instanceof Table ? tableOrName.name : tableOrName;

    return `PK_${tableName}`;
  }
}
