import * as path from 'path';
import { MarketConfig } from "./market-config";

export default {
  postgresUrl: process.env.POSTGRES_URL || 'postgres://marketplace:12345@marketplace-postgres:5432/marketplace_db',
  testingPostgresUrl: 'postgres://postgresman:test12345@127.0.0.1:6432/marketplace_db',
  listenPort: parseInt(process.env.API_PORT || '5000'),
  disableSecurity: process.env.DISABLE_SECURITY === 'true',
  rootDir: path.normalize(path.join(__dirname, '..')),
  autoDBMigrations: process.env.AUTO_DB_MIGRATIONS === 'true',
  dev: {
    debugMigrations: false,
    debugScanBlock: false,
  },
  sentry: {
    enabled: process.env.SENTRY_ENABLED === 'true',
    environment: process.env.SENTRY_ENV || 'dev', // | 'production' | 'some_environment',
    dsn: process.env.SENTRY_DSN || 'https://hash@domain.tld/sentryId',
    debug: process.env.SENTRY_DEBUG === 'true',
    release: process.env.SENTRY_RELEASE || '',
  },
  swagger: {
    title: 'Marketplace api',
    version: '1.0',
    description: '',
  },
  blockchain: {
    escrowSeed: process.env.ESCROW_SEED || null, // For kusama and contract creation
    unique: {
      wsEndpoint: process.env.UNIQUE_WS_ENDPOINT || 'wss://opal.unique.network',
      network: process.env.UNIQUE_NETWORK || 'quartz',
      startFromBlock: `${process.env.UNIQUE_START_FROM_BLOCK || 'current'}`,
      contractOwnerSeed: process.env.CONTRACT_ETH_OWNER_SEED || null,
      contractAddress: process.env.CONTRACT_ADDRESS || null,
      collectionIds: (process.env.UNIQUE_COLLECTION_IDS || '')
        .split(',')
        .map((x) => Number(x.trim()))
        .filter((x) => !isNaN(x) && x > 0 && x !== Infinity),
    },
    kusama: {
      wsEndpoint: process.env.KUSAMA_WS_ENDPOINT || 'wss://kusama-rpc.polkadot.io',
      network: process.env.KUSAMA_NETWORK || 'kusama',
      startFromBlock: `${process.env.KUSAMA_START_FROM_BLOCK || 'current'}`,
      ss58Format: parseInt(process.env.KUSAMA_SS58_FORMAT || '2'),
      marketCommission: parseInt(process.env.COMMISSION_PERCENT || '10'),
      waitBlocks: parseInt(process.env.KUSAMA_WAIT_BLOCKS || '0'),
    },
    testing: {
      escrowSeed: '//Alice',
      unique: {
        wsEndpoint: 'ws://localhost:9944',
        network: 'private_opal',
        startFromBlock: '1',
        contractOwnerSeed: null,
        contractAddress: null,
        collectionIds: [1],
      },
      kusama: {
        wsEndpoint: 'wss://ws-relay-opal.unique.network',
        network: 'private_kusama',
        startFromBlock: '1',
      },
    },
  },
  auction: {
    seed: process.env.AUCTION_SEED || '',
    commission: parseInt(process.env.AUCTION_COMMISSION || '10', 10),
  },
  ipfs: process.env.IPFS || 'https://ipfs.unique.network/ipfs',
} as MarketConfig;
