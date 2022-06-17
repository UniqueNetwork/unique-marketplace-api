import { runMigrations } from '../../database/migrations';

export const main = async (moduleRef) => {
  const config = moduleRef.get('CONFIG', { strict: false });
  await runMigrations(config, 'migrations');
};
