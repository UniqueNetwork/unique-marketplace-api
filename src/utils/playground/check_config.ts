import { red, green } from 'cli-color';
import * as unique from "../blockchain/unique";
import * as lib from "../blockchain/web3";

const fail = (message, fatal=false) => {
  console.log(`${red('[x]')} ${message}`);
  if(fatal) process.exit(0);
}
const success = message => {
  console.log(`${green('[v]')} ${message}`);
}

export const main = async (moduleRef) => {
  const config = moduleRef.get('CONFIG', {strict: false});
  let api, web3, web3conn;
  try {
    web3conn = lib.connectWeb3(config.blockchain.unique.wsEndpoint);
    api = await unique.connectApi(config.blockchain.unique.wsEndpoint, false);
    web3 = web3conn.web3;
  }
  catch (e) {
    fail(`Unable to connect to UNIQUE_WS_ENDPOINT (${config.blockchain.unique.wsEndpoint})`);
  }

  if(config.blockchain.unique.contractAddress) {
    let address = config.blockchain.unique.contractAddress;
    success(`Contract address valid: ${address}`);
    const balance = (await api.rpc.eth.getBalance(config.blockchain.unique.contractAddress)).toBigInt();
    if (balance === 0n) {
      fail(`Contract balance is zero, transactions will be failed via insufficient balance error`);
    } else {
      success(`Contract balance is ${balance / lib.UNIQUE} tokens (${balance})`);
    }
    if (!(await api.query.evmContractHelpers.selfSponsoring(address)).toJSON()) {
      fail(`Contract self-sponsoring is not enabled\nYou should call toggleSelfSponsoring first`);
    } else {
      success(`Contract self-sponsoring is enabled`);
    }
    const rateLimit = (await api.query.evmContractHelpers.sponsoringRateLimit(address)).toJSON() as number;
    if (rateLimit !== 0) {
      fail(`Rate limit is not zero, users should wait ${rateLimit} blocks between calling sponsoring`);
    } else {
      success(`Rate limit is zero blocks`);
    }
  }
  else {
    fail('No contract address provided. You must set CONTRACT_ADDRESS env variable, or override blockchain.unique.contractAddress in config');
  }
  if(config.blockchain.unique.contractOwnerSeed) {
    try {
      let account = web3.eth.accounts.privateKeyToAccount(config.blockchain.unique.contractOwnerSeed);
      success(`Contract owner valid, owner address: ${account.address}`);
      let balance = (await api.rpc.eth.getBalance(account.address)).toBigInt();
      console.log(`Contract owner balance is ${balance / lib.UNIQUE} tokens (${balance})`)
    }
    catch(e) {
      fail(`Invalid contract owner seed (${config.blockchain.unique.contractOwnerSeed})`);
    }
  }
  else {
    fail('No contract owner seed provided. You must set CONTRACT_ETH_OWNER_SEED env variable or override blockchain.unique.contractOwnerSeed in config');
  }

  web3conn.provider.connection.close()
  await api.disconnect();
}