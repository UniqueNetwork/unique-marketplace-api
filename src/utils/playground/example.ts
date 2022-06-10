const pg = require('../../../package.json');

export const main = async (moduleRef, args: string[]) => {
  console.log(pg);
  console.log('example playground main');
  console.log('every playground file must export "async main(moduleRef, args: string[])" function');
};
