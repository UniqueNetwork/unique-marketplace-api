import { evmToAddress } from '@polkadot/util-crypto';

import * as unique from '../blockchain/unique';
import * as lib from '../blockchain/web3';
import * as util from '../blockchain/util';

import { signTransaction, transactionStatus } from '../blockchain/polka';
import * as logging from '../logging'


const DEPLOY_COST = 9n * lib.UNIQUE;
const CONTRACT_MIN_BALANCE = 40n * lib.UNIQUE;
const ESCROW_MIN_BALANCE = (5n * lib.UNIQUE) / 10n;

export const main = async(moduleRef, args: string[]) => {
  let summary = [];
  const config = moduleRef.get('CONFIG', {strict: false});
  if(config.blockchain.escrowSeed === null) {
    logging.log('You need to set ESCROW_SEED env or override config "blockchain.escrowSeed" section');
    return;
  }

  logging.log(['WS endpoint:', config.blockchain.unique.wsEndpoint]);
  const web3conn = lib.connectWeb3(config.blockchain.unique.wsEndpoint);
  const api = await unique.connectApi(config.blockchain.unique.wsEndpoint, false), web3 = web3conn.web3;
  let ownerSeed = config.blockchain.unique.contractOwnerSeed;

  const disconnect = async () => {
    if(summary.length) {
      console.log(`\n\n\nSUMMARY:\n\n${summary.join('\n')}`);
    }
    web3conn.provider.connection.close()
    await api.disconnect();
    process.exit(0);
  }

  const getBalance = async address => {
    return ((await api.query.system.account(address)) as any).data.free.toBigInt();
  }

  const addSubstrateMirror = async address => {
    summary.push(`\n\nSubstrate mirror of contract address (for balances): ${evmToAddress(address)}`);
    summary.push(`Current contract balance: ${await getBalance(evmToAddress(address))}`);
  }

  const escrow = util.privateKey(config.blockchain.escrowSeed);

  logging.log(['Escrow substrate address:', escrow.address]);
  {
    let balance = await getBalance(escrow.address);
    logging.log(['Balance on escrow:', balance.toString()]);
  }
  if(config.blockchain.unique.contractOwnerSeed === null) {
    logging.log('No existed CONTRACT_ETH_OWNER_SEED, creating new eth account');
    let balance = await getBalance(escrow.address);
    let minBalance = CONTRACT_MIN_BALANCE + ESCROW_MIN_BALANCE + DEPLOY_COST;
    if (balance < minBalance) {
      logging.log(['Balance on account', escrow.address, 'too low to create eth account. Need at least', minBalance.toString()])
      return await disconnect();
    }
    const account = web3.eth.accounts.create();

    let result = await signTransaction(escrow, api.tx.balances.transfer(evmToAddress(account.address), DEPLOY_COST), 'api.tx.balances.transfer') as any;
    if(result.status !== transactionStatus.SUCCESS) {
      logging.log(['Unable to transfer', DEPLOY_COST.toString(), 'from', escrow.address, 'to', evmToAddress(account.address)], logging.level.ERROR);
      logging.log(result.result.toHuman(), logging.level.ERROR);
      return await disconnect();
    }

    logging.log(['Your new eth account seed:', account.privateKey]);
    logging.log(['Your new eth account address:', account.address]);
    logging.log('Set it to CONTRACT_ETH_OWNER_SEED env or override config "blockchain.unique.contractOwnerSeed" section');
    ownerSeed = account.privateKey;
  }
  summary.push(`CONTRACT_ETH_OWNER_SEED: '${ownerSeed}'`);
  if(config.blockchain.unique.contractAddress !== null) {
    logging.log('Contract already deployed. Check your CONTRACT_ADDRESS env or "blockchain.unique.contractAddress" config section', logging.level.WARNING);

    summary.push(`CONTRACT_ADDRESS: '${config.blockchain.unique.contractAddress}'`);
    await addSubstrateMirror(config.blockchain.unique.contractAddress);

    return await disconnect();
  }
  let balance = await getBalance(escrow.address);
  let minBalance = CONTRACT_MIN_BALANCE + ESCROW_MIN_BALANCE;
  if (balance < minBalance) {
    logging.log(['Balance on account', escrow.address, 'too low to deploy contract. Need at least', minBalance.toString()], logging.level.WARNING)
    return await disconnect();
  }
  logging.log('Deploy contract...');
  const account = web3.eth.accounts.privateKeyToAccount(ownerSeed);
  web3.eth.accounts.wallet.add(account.privateKey);

  const contractAbi = new web3.eth.Contract(JSON.parse(util.blockchainStaticFile('MarketPlace.abi')), undefined, {
    from: account.address, ...lib.GAS_ARGS,
  });
  const contract = await contractAbi.deploy({data: util.blockchainStaticFile('MarketPlace.bin')}).send({from: account.address, gas: 5_000_000});
  logging.log('Set escrow...');
  await contract.methods.setEscrow(account.address, true).send({from: account.address});
  const helpers = lib.contractHelpers(web3, account.address);
  logging.log('Set sponsoring mode...');
  // await helpers.methods.toggleSponsoring(contract.options.address, true).send({from: account.address});
  await helpers.methods.setSponsoringMode(contract.options.address, lib.SponsoringMode.Allowlisted).send({from: account.address});
  logging.log('Set sponsoring rate limit...')
  await helpers.methods.setSponsoringRateLimit(contract.options.address, 0).send({from: account.address});
  logging.log('Transfer balance...');
  let result = await signTransaction(escrow, api.tx.balances.transfer(evmToAddress(contract.options.address), CONTRACT_MIN_BALANCE), 'api.tx.balances.transfer') as any;
  if(result.status !== transactionStatus.SUCCESS) {
    logging.log(['Unable to transfer', CONTRACT_MIN_BALANCE.toString(), 'from', escrow.address, 'to', evmToAddress(contract.options.address)], logging.level.ERROR);
    logging.log(result.result.toHuman(), logging.level.ERROR);
    return await disconnect();
  }
  logging.log('All done');
  logging.log(['Your new contract address:', contract.options.address]);
  logging.log('Set it to CONTRACT_ADDRESS env or override config "blockchain.unique.contractAddress"');
  summary.push(`CONTRACT_ADDRESS: '${contract.options.address}'`);
  await addSubstrateMirror(contract.options.address);

  return await disconnect();
}