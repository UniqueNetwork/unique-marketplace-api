import { InitialOptionsTsJest } from 'ts-jest';
const esModules = ['@polkadot/'].join('|');

export default {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testEnvironment: 'node',
  testRegex: '.test.ts$',
  verbose: true,
  transform: {
    '^.+\\.(js|ts)$': 'ts-jest',
  },
  transformIgnorePatterns: [`/node_modules/(?!${esModules})`],
} as InitialOptionsTsJest;
