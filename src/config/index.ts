import { MarketConfig } from './market-config';

export const mergeDeep = (...objects) => {
  const isObject = (obj) => obj && typeof obj === 'object' && !Array.isArray(obj);

  return objects.reduce((prev, obj) => {
    Object.keys(obj).forEach((key) => {
      const pVal = prev[key];
      const oVal = obj[key];

      if (isObject(pVal) && isObject(oVal)) {
        prev[key] = mergeDeep(pVal, oVal);
      } else {
        prev[key] = oVal;
      }
    });

    return prev;
  }, {});
};

export const getConfig = (mode?: string): MarketConfig => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const config = require('./global').default;
  if (typeof mode === 'undefined') mode = process.env.RUN_MODE || 'dev';
  let localConfig;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    localConfig = require(`./${mode}`).default;
  } catch (e) {
    localConfig = {};
  }
  if (mode === 'test') localConfig.inTesting = true;
  return mergeDeep(config, localConfig);
};
