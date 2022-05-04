import { red, green } from 'cli-color';

import * as unique from '../blockchain/unique';
import * as lib from '../blockchain/web3';
import { seedToAddress } from '../blockchain/util';


const fail = (message, fatal=false, indent='') => {
  console.log(`${indent}${red('[x]')} ${message}`);
  if(fatal) process.exit(0);
}
const success = (message, indent='') => {
  console.log(`${indent}${green('[v]')} ${message}`);
}

const checkCollection = async (collectionId, api, indent='  ') => {
  let collection = (await api.query.common.collectionById(collectionId)).toHuman();
  if(collection === null) {
    fail('Collection does not exists', false, indent);
    return;
  }
  let sponsorship = collection.sponsorship;
  if(typeof collection.sponsorship !== 'string') {
    sponsorship = {}
    for(let key of Object.keys(collection.sponsorship)) {
      sponsorship[key.toLocaleLowerCase()] = collection.sponsorship[key];
    }
  }
  if ((typeof sponsorship === 'string' && sponsorship.toLocaleLowerCase() === 'disabled') || sponsorship.disabled) {
    fail(`Sponsoring is disabled`, false, indent);
  }
  else if (sponsorship.pending) {
    fail(`Sponsoring is pending. ${sponsorship.pending} should confirm sponsoring via confirmSponsorship`, false, indent);
  }
  else if (sponsorship.confirmed) {
    const address = sponsorship.confirmed;
    const evmAddress = lib.subToEth(address);
    success(`Sponsor is confirmed, ${address}`, indent);
    {
      const balance = (await api.query.system.account(address)).data.free.toBigInt();
      if (balance === 0n) {
        fail(`The sponsor's wallet is empty. Transfer some funds to ${address}`, false, indent);
      } else {
        success(`Sponsor has ${balanceString(balance)} on its substrate wallet`, indent);
      }
    }
    {
      /*
      const balance = (await api.rpc.eth.getBalance(evmAddress)).toBigInt();
      if (balance === 0n) {
        fail(`Ethereum wallet of sponsor is empty. Transfer some funds to ${evmAddress} [${address}]`, false, indent);
      } else {
        success(`Sponsor has ${balanceString(balance)} on its ethereum wallet`, indent);
      }*/
    }
  }
  else {
    fail(`Unknown sponsorship state: ${Object.keys(collection.sponsorship)[0]}`, false, indent);
  }

  {
    const timeout = collection.limits.sponsorTransferTimeout;
    if(timeout === null || timeout.toString() !== '0') {
      fail(`Transfer timeout is ${timeout || 'not set (default, non-zero is used)'}`, false, indent);
    } else {
      success(`Transfer timeout is zero blocks`, indent);
    }
  }
  {
    const timeout = collection.limits.sponsorApproveTimeout;
    if(timeout === null || timeout.toString() !== '0') {
      fail(`Approve timeout is ${timeout || 'not set (default, non-zero is used)'}`, false, indent);
    } else {
      success(`Approve timeout is zero blocks`, indent);
    }
  }
}

const balanceString = balance => `${balance / lib.UNIQUE} tokens (${balance})`;

export const main = async (moduleRef, args: string[]) => {
  const config = moduleRef.get('CONFIG', {strict: false});
  let api, web3, web3conn;
  try {
    web3conn = lib.connectWeb3(config.blockchain.unique.wsEndpoint);
    api = await unique.connectApi(config.blockchain.unique.wsEndpoint, false);
    web3 = web3conn.web3;
  }
  catch (e) {
    fail(`Unable to connect to UNIQUE_WS_ENDPOINT (${config.blockchain.unique.wsEndpoint})`, true);
  }

  console.log(`UNIQUE_WS_ENDPOINT: ${config.blockchain.unique.wsEndpoint}`)

  if(!config.blockchain.escrowSeed) {
    fail('No ESCROW_SEED provided')
  }
  else {
    let escrowAddress = await seedToAddress(config.blockchain.escrowSeed);
    success(`Escrow address (Extracted from ESCROW_SEED): ${escrowAddress}`);
    {
      const balance = (await api.query.system.account(escrowAddress)).data.free.toBigInt();
      console.log(`Escrow balance: ${balanceString(balance)}`);
    }
  }

  console.log('\nChecking CONTRACT_ADDRESS');

  let validContract = false;

  if(config.blockchain.unique.contractAddress) {
    let code = '';
    try {
      code = await api.rpc.eth.getCode(config.blockchain.unique.contractAddress);
    } catch (e) {
      code = '';
    }
    validContract = code.length > 0;
  }
  else {
    fail('No contract address provided. You must set CONTRACT_ADDRESS env variable, or override blockchain.unique.contractAddress in config');
  }
  if (validContract) {
    let address = config.blockchain.unique.contractAddress;
    success(`Contract address valid: ${address}`);
    const balance = (await api.rpc.eth.getBalance(config.blockchain.unique.contractAddress)).toBigInt();
    if (balance === 0n) {
      fail(`Contract balance is zero, transactions will be failed via insufficient balance error`);
    } else {
      success(`Contract balance is ${balanceString(balance)}`);
    }
    const sponsoring = (await api.query.evmContractHelpers.selfSponsoring(address)).toJSON();
    const sponsoringMode = (await api.query.evmContractHelpers.sponsoringMode(address)).toJSON();
    const allowedModes = ["Generous", "Allowlisted"];
    if (allowedModes.indexOf(sponsoringMode) === -1 && !sponsoring) {
      fail(`Contract self-sponsoring is not enabled. You should call setSponsoringMode first`);
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
  else if (config.blockchain.unique.contractAddress) {
    fail(`Contract address invalid: ${config.blockchain.unique.contractAddress}`);
  }
  if(config.blockchain.unique.contractOwnerSeed) {
    try {
      let account = web3.eth.accounts.privateKeyToAccount(config.blockchain.unique.contractOwnerSeed);
      success(`Contract owner valid, owner address: ${account.address}`);
      let balance = (await api.rpc.eth.getBalance(account.address)).toBigInt();
      console.log(`Contract owner balance is ${balanceString(balance)}`)
    }
    catch(e) {
      fail(`Invalid contract owner seed (${config.blockchain.unique.contractOwnerSeed})`);
    }
  }
  else {
    fail('No contract owner seed provided. You must set CONTRACT_ETH_OWNER_SEED env variable or override blockchain.unique.contractOwnerSeed in config');
  }

  console.log('\nChecking UNIQUE_COLLECTION_IDS');
  for(let collectionId of config.blockchain.unique.collectionIds) {
    console.log(`Collection #${collectionId}`)
    await checkCollection(collectionId, api);
  }

  web3conn.provider.connection.close()
  await api.disconnect();
}