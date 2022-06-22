/* eslint-disable @typescript-eslint/no-unused-vars */
import { getConfig } from '../../config';

export const main = async (moduleRef, args: string[]) => {
  const config = getConfig();

  const getPriceWithoutCommission = (price: bigint, config) => {
    const commission = BigInt(100 + parseInt(config.blockchain.kusama.marketCommission));
    return (price * 100n) / commission;
  };
  console.log('example playground main');
  console.log('every playground file must export "async main(moduleRef, args: string[])" function');
  const num = getPriceWithoutCommission(BigInt(1800000000000), config);
  console.log(num);
};
