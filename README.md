# Unique Marketplace Backend

Backend project for unique marketplace.

## Service settings

All settings based on env variables and listed in `docker-compose.example.yml` file. You can create your own `docker-compose.yml` file based on example, change settings and run service.

## Running database migrations

Migrations can start automatically by setting `AUTO_DB_MIGRATIONS` env to `true`, or you can run `npm run playground migrate_db` to start migrations manually (highly recommended)

