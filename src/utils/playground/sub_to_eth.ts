import { evmToAddress, validateAddress } from '@polkadot/util-crypto';
import { cyan, yellow, red } from 'cli-color';

import * as unique from '../blockchain/unique';
import * as lib from '../blockchain/web3';

export const main = async (moduleRef, args: string[]) => {
  const config = moduleRef.get('CONFIG', { strict: false });

  console.log('WS endpoint:', config.blockchain.unique.wsEndpoint);
  const api = await unique.connectApi(config.blockchain.unique.wsEndpoint, false);

  for (const address of args) {
    console.log('\n');
    let isValid = false;
    try {
      isValid = validateAddress(address);
    } catch (e) {}
    if (!isValid) {
      console.log(red(`${address} is not valid substrate address`));
      continue;
    }
    const ethAddress = lib.subToEth(address),
      subMirrorAddress = evmToAddress(ethAddress);
    console.log(cyan('Substrate address:'), address);
    //console.log(cyan('Substrate address balance:'), yellow(BigInt((await api.query.system.account(address)).data.free.toJSON()).toString()));
    console.log(cyan('Ethereum mirror:'), ethAddress);
    console.log(cyan('Ethereum mirror balance:'), yellow((await api.rpc.eth.getBalance(ethAddress)).toBigInt().toString()));
    console.log(cyan('Substrate mirror of ethereum mirror:'), subMirrorAddress);
    //console.log(cyan('Substrate mirror of ethereum mirror balance:'), yellow(BigInt((await api.query.system.account(subMirrorAddress)).data.free.toJSON()).toString()));
  }
  await api.disconnect();
};
