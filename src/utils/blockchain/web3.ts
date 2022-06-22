import { ApiPromise } from '@polkadot/api';
import { addressToEvm, evmToAddress } from '@polkadot/util-crypto';
import Web3 from 'web3';

import { signTransaction } from './signTransaction';
import { privateKey, blockchainStaticFile } from './util';

const contractHelpersAbi = JSON.parse(blockchainStaticFile('contractHelpersAbi.json'));
const nonFungibleAbi = JSON.parse(blockchainStaticFile('nonFungibleAbi.json'));

enum SponsoringMode {
  Disabled = 0,
  Allowlisted = 1,
  Generous = 2,
}

const GAS_ARGS = { gas: 2500000 };
const MICROUNIQUE = 1_000_000_000_000n;
const MILLIUNIQUE = 1_000n * MICROUNIQUE;
const CENTIUNIQUE = 10n * MILLIUNIQUE;
const UNIQUE = 100n * CENTIUNIQUE;

const connectWeb3 = (opalUrl) => {
  const provider = new Web3.providers.WebsocketProvider(opalUrl, {
    reconnect: { auto: true, maxAttempts: 5, delay: 1000 },
  });
  const web3 = new Web3(provider);

  return { web3, provider };
};

const createEthAccount = (web3) => {
  const account = web3.eth.accounts.create();
  web3.eth.accounts.wallet.add(account.privateKey);
  return account.address;
};

const collectionIdToAddress = (address: number): string => {
  if (address >= 0xffffffff || address < 0) throw new Error('id overflow');
  const buf = Buffer.from([
    0x17,
    0xc4,
    0xe6,
    0x45,
    0x3c,
    0xc4,
    0x9a,
    0xaa,
    0xae,
    0xac,
    0xa8,
    0x94,
    0xe6,
    0xd9,
    0x68,
    0x3e,
    address >> 24,
    (address >> 16) & 0xff,
    (address >> 8) & 0xff,
    address & 0xff,
  ]);
  return Web3.utils.toChecksumAddress('0x' + buf.toString('hex'));
};

const createEthAccountWithBalance = async (api: ApiPromise, web3) => {
  const alice = privateKey('//Alice');
  const account = web3.eth.accounts.create();
  web3.eth.accounts.wallet.add(account.privateKey);
  await transferBalanceToEth(api, alice, account.address);

  return account;
};

const subToEthLowercase = (eth: string): string => {
  const bytes = addressToEvm(eth);
  return '0x' + Buffer.from(bytes).toString('hex');
};

const subToEth = (eth: string): string => {
  return Web3.utils.toChecksumAddress(subToEthLowercase(eth));
};

const transferBalanceToEth = async (api: ApiPromise, admin, target: string, amount = 1000n * UNIQUE) => {
  const tx = api.tx.balances.transfer(evmToAddress(target), amount);
  return await signTransaction(admin, tx, 'api.tx.balances.transfer');
};

const contractHelpers = (web3, caller: string) => {
  return new web3.eth.Contract(contractHelpersAbi, '0x842899ECF380553E8a4de75bF534cdf6fBF64049', {
    from: caller,
    ...GAS_ARGS,
  });
};

const createEvmCollection = (collectionId: number, from, web3) => {
  return new web3.eth.Contract(nonFungibleAbi, collectionIdToAddress(collectionId), { from });
};

const executeEthTxOnSub = async (web3, api: ApiPromise, admin, to: any, mkTx: (methods: any) => any, { value = 0 }: { value?: bigint | number } = {}) => {
  const tx = api.tx.evm.call(
    subToEth(admin.address),
    to.options.address,
    mkTx(to.methods).encodeABI(),
    value,
    GAS_ARGS.gas,
    await web3.eth.getGasPrice(),
    null,
    null,
    [],
  );
  const result = (await signTransaction(admin, tx, 'api.tx.evm.call')) as any;
  return {
    success: result.result.events.some(({ event: { section, method } }) => section == 'evm' && method == 'Executed'),
    result: result,
  };
};

const unlockAccount = (web3, account, password, timeout = 60) => {
  return web3.eth.personal.unlockAccount(account, password, timeout);
};

export {
  createEthAccount,
  createEthAccountWithBalance,
  createEvmCollection,
  transferBalanceToEth,
  subToEth,
  subToEthLowercase,
  GAS_ARGS,
  UNIQUE,
  contractHelpers,
  connectWeb3,
  executeEthTxOnSub,
  unlockAccount,
  collectionIdToAddress,
  nonFungibleAbi,
  SponsoringMode,
};
