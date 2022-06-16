import { InitialOptionsTsJest } from 'ts-jest';

const esModules = ['@polkadot/'].join('|');

export default {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testEnvironment: 'node',
  testRegex: '.test.ts$',
  verbose: true,
  transform: {
    '^.+\\.(js|ts|json)$': 'ts-jest',
  },
  transformIgnorePatterns: [`/node_modules/(?!${esModules})`],
  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/tsconfig.json',
    },
  },
} as InitialOptionsTsJest;
