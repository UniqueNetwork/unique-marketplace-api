import { runMigrations } from '../../database/migrations';

export const main = async (moduleRef, args: string[]) => {
  const config = moduleRef.get('CONFIG', {strict: false});
  await runMigrations(config, 'migrations');
}