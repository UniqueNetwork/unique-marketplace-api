const { addressToEvm, evmToAddress, validateAddress } = require('@polkadot/util-crypto');
const { ApiPromise, WsProvider } = require('@polkadot/api');
const { cyan, yellow, red } = require('cli-color');
const Web3 = require('web3');

const subToEthLowercase = eth => {
  const bytes = addressToEvm(eth);
  return '0x' + Buffer.from(bytes).toString('hex');
}

const subToEth = eth => {
  return Web3.utils.toChecksumAddress(subToEthLowercase(eth));
}

const main = async () => {

  let args = process.argv.slice(2);

  const api = new ApiPromise({
    provider: new WsProvider(process.env.UNIQUE_WS_ENDPOINT || 'wss://opal.unique.network'),
    rpc: { unique: require('@unique-nft/types/definitions').unique.rpc }
  });

  await api.isReady;

  for(let address of args) {
    console.log('\n');
    let isValid = false;
    try {
      isValid = validateAddress(address);
    }
    catch (e) {}
    if(!isValid) {
      console.log(red(`${address} is not valid substrate address`));
      continue;
    }
    let ethAddress = subToEth(address), subMirrorAddress = evmToAddress(ethAddress);
    console.log(cyan('Substrate address:'), address);
    console.log(cyan('Substrate address balance:'), yellow((await api.query.system.account(address)).data.free.toBigInt().toString()));
    console.log(cyan('Ethereum mirror:'), ethAddress);
    console.log(cyan('Ethereum mirror balance:'), yellow((await api.rpc.eth.getBalance(ethAddress)).toBigInt().toString()));
    console.log(cyan('Substrate mirror of ethereum mirror:'), subMirrorAddress);
    console.log(cyan('Substrate mirror of ethereum mirror balance:'), yellow((await api.query.system.account(subMirrorAddress)).data.free.toBigInt().toString()));
  }
  await api.disconnect();
}

main().then(() => process.exit(0)).catch(e => {
  console.error(e);
  process.exit(1);
});
