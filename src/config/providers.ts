import { getConfig } from './index';

export const configProviders = [
  {
    provide: 'CONFIG',
    useFactory: () => {
      return getConfig();
    },
  },
];
