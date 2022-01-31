// import { evmToAddress } from '@polkadot/util-crypto';

import { Escrow } from './base';
import * as logging from '../utils/logging';
import * as lib from '../utils/blockchain/web3';
import * as unique from '../utils/blockchain/unique';
import * as util from '../utils/blockchain/util';
import { MONEY_TRANSFER_STATUS } from './constants';


export class UniqueEscrow extends Escrow {
  inputDecoder;
  explorer;
  web3;
  contractOwner;
  SECTION_UNIQUE = 'unique';
  SECTION_CONTRACT = 'evm';
  SECTION_ETHEREUM = 'ethereum';

  BLOCKED_SCHEMA_KEYS = ['ipfsJson'];

  address2string(address): string {
    if(typeof address === 'string') return address;
    if(address.Ethereum) return address.Ethereum;
    if(address.ethereum) return address.ethereum;
    if(address.Substrate) return address.Substrate;
    if(address.substrate) return address.substrate;
    throw Error('Invalid address');
  }

  async init() {
    this.initialized = true;
    await this.connectApi();
    const InputDataDecoder = require('ethereum-input-data-decoder');
    this.inputDecoder = new InputDataDecoder(this.getAbi());
    this.explorer = new util.UniqueExplorer(this.api, this.admin);
    this.web3 = lib.connectWeb3(this.config('unique.wsEndpoint')).web3;
    this.contractOwner = this.web3.eth.accounts.privateKeyToAccount(this.config('unique.contractOwnerSeed'));
  }

  getAbi() {
    return JSON.parse(util.blockchainStaticFile('MarketPlace.abi'));
  }

  getContract(): {web3: any, contract: any, helpers: any} {
    const web3 = lib.connectWeb3(this.config('unique.wsEndpoint')).web3;
    web3.eth.accounts.wallet.add(this.contractOwner.privateKey);

    return {
      web3,
      contract: new web3.eth.Contract(this.getAbi(), this.config('unique.contractAddress')),
      helpers: lib.contractHelpers(web3, this.contractOwner.address)
    };
  }

  async addToAllowList(substrateAddress, data?: {contract: any, helpers: any}) {
    let contractAddress = this.config('unique.contractAddress');
    let ethAddress = lib.subToEth(substrateAddress), toAdd = [];
    // let toCheck = [substrateAddress, ethAddress, evmToAddress(ethAddress, 42, 'blake2')];
    let toCheck = [ethAddress];
    for(let address of toCheck) {
      let isAllowed = (await this.api.query.evmContractHelpers.allowlist(contractAddress, address)).toJSON();
      if(!isAllowed) toAdd.push(address);
    }
    if(!toAdd.length) return;

    if(!data) data = this.getContract();
    for(let address of toAdd) {
      await data.helpers.methods.toggleAllowed(data.contract.options.address, address, true).send({from: this.contractOwner.address});
    }
  }

  isCollectionManaged(collectionId: number) {
    return (this.config('unique.collectionIds').indexOf(collectionId) !== -1);
  }

  getPriceWithoutCommission(price: bigint) {
    let commission = BigInt(100 + parseInt(this.config('kusama.marketCommission')));
    return (price * 100n) / commission;
  }

  async connectApi() {
    this.api = await unique.connectApi(this.config('unique.wsEndpoint'), true);
    this.admin = util.privateKey(this.config('escrowSeed'));
  }

  *convertEnumToString(value, key, protoSchema) {
    try {
      let valueJsonComment = protoSchema.fields[key].resolvedType.options[value];
      let translationObject = JSON.parse(valueJsonComment);
      if (translationObject) {
        yield* Object.keys(translationObject).map(k => ({ locale: k, text: translationObject[k] }));
      }
    } catch (e) {
      logging.log('Error parsing schema when trying to convert enum to string', logging.level.ERROR);
      logging.log(e, logging.level.ERROR);
    }
  }

  *getKeywords(protoSchema, dataObj) {
    for(let key of Object.keys(dataObj)) {
      if(this.BLOCKED_SCHEMA_KEYS.indexOf(key) > -1) continue;
      yield {locale: null, text: key};
      if (protoSchema.fields[key].resolvedType && protoSchema.fields[key].resolvedType.constructor.name.toString() === "Enum") {
        if (Array.isArray(dataObj[key])) {
          for (let i = 0; i < dataObj[key].length; i++) {
            yield* this.convertEnumToString(dataObj[key][i], key, protoSchema);
          }
        } else {
          yield* this.convertEnumToString(dataObj[key], key, protoSchema);
        }
      } else {
        yield {locale: null, text: dataObj[key]};
      }
    }
  }

  async getSearchIndexes(collectionId, tokenId) {
    let keywords = [];
    try {
      let data = await this.explorer.getTokenData(tokenId, collectionId);
      keywords.push({locale: null, text: data.collection.toHuman().tokenPrefix});
      for (let k of this.getKeywords(data.schema.NFTMeta, data.data.human)) {
        keywords.push(k);
      }
    }
    catch (e) {
      logging.log(`Unable to get search indexes for token #${tokenId} from collection #${collectionId}`, logging.level.ERROR);
      logging.log(e, logging.level.ERROR);
    }
    keywords.push({locale: null, text: tokenId.toString()});

    return keywords.filter(x => typeof x.text === 'string' && x.text.trim() !== '');
  }

  async processTransfer(blockNum, rawExtrinsic) {
    const extrinsic = rawExtrinsic.toHuman().method;
    const addressFrom = util.normalizeAccountId(rawExtrinsic.signer.toString());
    const addressTo = util.normalizeAccountId(extrinsic.args.recipient);
    const collectionId = parseInt(extrinsic.args.collection_id);
    const tokenId = parseInt(extrinsic.args.item_id);
    if(!this.isCollectionManaged(collectionId)) return; // Collection not managed by market
    await this.service.registerTransfer(blockNum, {
      collectionId, tokenId, addressTo: this.address2string(addressTo), addressFrom: this.address2string(addressFrom)
    }, this.getNetwork());
    logging.log(`Got nft transfer (collectionId: ${collectionId}, tokenId: ${tokenId}) in block #${blockNum}`);
  }

  async processAddAsk(blockNum, extrinsic, inputData, signer) {
    const addressTo = util.normalizeAccountId(extrinsic.args.target);
    const addressFrom = signer.toString(); // signer is substrate address of args.source
    const addressFromEth = util.normalizeAccountId(extrinsic.args.source);
    const price = inputData.inputs[0].toString();
    const currency = inputData.inputs[1];
    const collectionEVMAddress = inputData.inputs[2];
    const collectionId = util.extractCollectionIdFromAddress(collectionEVMAddress);
    const tokenId = inputData.inputs[3].toNumber();
    if(!this.isCollectionManaged(collectionId)) return; // Collection not managed by market
    await this.service.registerAccountPair(addressFrom, this.address2string(addressFromEth));

    let isToContract = this.address2string(addressTo).toLocaleLowerCase() === this.config('unique.contractAddress').toLocaleLowerCase();
    if(!isToContract) return;
    logging.log(`Got ask (collectionId: ${collectionId}, tokenId: ${tokenId}, price: ${price}) in block #${blockNum}`);
    const tokenKeywords = await this.getSearchIndexes(collectionId, tokenId);
    await this.service.registerAsk(blockNum, {
      collectionId, tokenId, addressTo: this.address2string(addressTo), addressFrom, price, currency
    }, this.getNetwork());
    await this.service.addSearchIndexes(tokenKeywords, collectionId, tokenId, this.getNetwork());
    await this.addToAllowList(addressFrom);
  }

  async processBuyKSM(blockNum, extrinsic, inputData) {
    // const addressTo = util.normalizeAccountId(extrinsic.args.target);
    // const addressFrom = util.normalizeAccountId(extrinsic.args.source);
    const collectionEVMAddress = inputData.inputs[0];
    const collectionId = util.extractCollectionIdFromAddress(collectionEVMAddress);
    const tokenId = inputData.inputs[1].toNumber();
    const buyer = util.normalizeAccountId(inputData.inputs[2]);
    // const receiver = util.normalizeAccountId(inputData.inputs[3]);
    const activeAsk = await this.service.getActiveAsk(collectionId, tokenId, this.getNetwork());

    if(!activeAsk) return;
    const realPrice = BigInt(activeAsk.price);
    const origPrice = this.getPriceWithoutCommission(realPrice);
    const buyerEth = this.address2string(buyer);
    const buyerSub = await this.service.getSubstrateAddress(buyerEth);
    const buyerAddress = buyerSub ? buyerSub : buyerEth;

    await this.service.registerTrade(buyerAddress, origPrice, activeAsk, blockNum, this.getNetwork());

    // Balance on smart-contract (Next tick in this escrow)
    await this.service.modifyContractBalance(-realPrice, activeAsk.address_from, blockNum, this.config('kusama.network'));
    // Real KSM (Processed on kusama escrow)
    await this.service.registerKusamaWithdraw(origPrice, activeAsk.address_from, blockNum, this.config('kusama.network'));

    logging.log(`Got buyKSM (collectionId: ${collectionId}, tokenId: ${tokenId}, buyer: ${buyerAddress}, price: ${activeAsk.price}, price without commission: ${origPrice}) in block #${blockNum}`);
  }

  async processCancelAsk(blockNum, extrinsic, inputData) {
    const collectionEVMAddress = inputData.inputs[0];
    const collectionId = util.extractCollectionIdFromAddress(collectionEVMAddress);
    if(!this.isCollectionManaged(collectionId)) return; // Collection not managed by market
    const tokenId = inputData.inputs[1].toNumber();
    const activeAsk = await this.service.getActiveAsk(collectionId, tokenId, this.getNetwork());
    logging.log(`Got cancelAsk (collectionId: ${collectionId}, tokenId: ${tokenId}) in block #${blockNum}`);
    if(!activeAsk) {
      logging.log(`No active offer for token ${tokenId} from collection ${collectionId}, nothing to cancel`, logging.level.WARNING);
    }
    else {
      await this.service.cancelAsk(collectionId, tokenId, blockNum, this.getNetwork());
    }
  }

  async processCall(blockNum, rawExtrinsic) {
    const extrinsic = rawExtrinsic.toHuman().method;
    const inputData = this.inputDecoder.decodeData(extrinsic.args.input);
    if(inputData.method === 'addAsk') {
      return await this.processAddAsk(blockNum, extrinsic, inputData, rawExtrinsic.signer);
    }
    if(inputData.method === 'buyKSM') {
      return await this.processBuyKSM(blockNum, extrinsic, inputData);
    }
    if(inputData.method === 'cancelAsk') {
      return await this.processCancelAsk(blockNum, extrinsic, inputData);
    }
  }

  async processEthereum(blockNum, rawExtrinsic) {
    const extrinsic = rawExtrinsic.toHuman().method;
    if(!('transaction' in extrinsic.args)) return;
    const inputData = this.inputDecoder.decodeData(extrinsic.args.transaction.input);
    if(inputData.method === 'depositKSM') {
      const amount = inputData.inputs[0].toString();
      const sender = util.normalizeAccountId(inputData.inputs[1]);
      logging.log(`Got depositKSM (Sender: ${this.address2string(sender)}, amount: ${amount}) in block #${blockNum}`);
    }
  }

  getNetwork(): string {
    return this.config('unique.network');
  }

  async extractBlockData(blockNum, isSuccess, rawExtrinsic) {
    if(!isSuccess) return;
    if(['parachainSystem'].indexOf(rawExtrinsic.method.section) > -1) return;
    if(this.configObj.dev.debugScanBlock && rawExtrinsic.method.section != 'timestamp') logging.log([blockNum, rawExtrinsic.method.section, rawExtrinsic.method.method]);
    if(rawExtrinsic.method.section === this.SECTION_UNIQUE && rawExtrinsic.method.method === 'transfer') {
      return await this.processTransfer(blockNum, rawExtrinsic);
    }
    if(rawExtrinsic.method.section === this.SECTION_CONTRACT && rawExtrinsic.method.method === 'call') {
      return await this.processCall(blockNum, rawExtrinsic);
    }
    if(rawExtrinsic.method.section === this.SECTION_ETHEREUM && rawExtrinsic.method.method === 'transact') {
      return await this.processEthereum(blockNum, rawExtrinsic);
    }
  }

  async processContractBalance() {
    while(true) {
      let deposit = await this.service.getPendingContractBalance(this.config('kusama.network'));
      if(!deposit) break;
      await this.service.updateMoneyTransferStatus(deposit.id, MONEY_TRANSFER_STATUS.IN_PROGRESS);
      let method = 'depositKSM';
      try {
        logging.log(`Unique deposit for money transfer #${deposit.id} started`);
        const amount = BigInt(deposit.amount);
        const ethAddress = lib.subToEth(deposit.extra.address);
        await this.service.registerAccountPair(deposit.extra.address, ethAddress);
        logging.log(['amount', amount.toString(), 'ethAddress', ethAddress]);
        const { contract, helpers } = this.getContract();
        await this.addToAllowList(deposit.extra.address, {contract: contract, helpers});

        if(amount < 0) {
          method = 'withdrawKSM'
          await contract.methods.withdrawKSM(-amount, ethAddress).send({
            from: this.contractOwner.address, ...lib.GAS_ARGS
          });
        }
        else {
          await contract.methods.depositKSM(amount, ethAddress).send({
            from: this.contractOwner.address, ...lib.GAS_ARGS
          });
        }

        await this.service.updateMoneyTransferStatus(deposit.id, MONEY_TRANSFER_STATUS.COMPLETED);
        logging.log(`Unique ${method} for money transfer #${deposit.id} successful`);
      }
      catch(e) {
        await this.service.updateMoneyTransferStatus(deposit.id, MONEY_TRANSFER_STATUS.FAILED);
        logging.log(`Unique ${method} for money transfer #${deposit.id} failed`, logging.level.ERROR);
        logging.log(e, logging.level.ERROR);
      }
    }
  }

  async processBlock(blockNum, force=false) {
    try {
      await this.scanBlock(blockNum, force);
    } catch(e) {
      logging.log(`Unable to scan block #${blockNum} (WTF?)`, logging.level.ERROR);
      logging.log(e, logging.level.ERROR);
    }
    await this.processContractBalance();
  }

  getStartFromBlock(): number | string {
    return this.config('unique.startFromBlock');
  }

  async work() {
    if(!this.initialized) throw Error('Unable to start uninitialized escrow. Call "await escrow.init()" before work');
    this.store.currentBlock = await this.getStartBlock();
    this.store.latestBlock = await this.getLatestBlockNumber();
    logging.log(`Unique escrow starting from block #${this.store.currentBlock} (mode: ${this.config('unique.startFromBlock')}, maxBlock: ${this.store.latestBlock})`)
    logging.log(`Unique escrow contract owner address: ${this.contractOwner.address}`);
    logging.log(`Unique escrow contract address: ${this.config('unique.contractAddress')}`);
    await this.subscribe();
    await this.mainLoop();
  }
}