import { IKeyringPair } from '@polkadot/types/types';
import { Keyring } from '@polkadot/api';
import { decodeAddress, encodeAddress } from '@polkadot/util-crypto';

import { Escrow } from './base';
import * as logging from '../utils/logging';
import { TransactionStatus } from '../utils/blockchain';
import { signTransaction } from '../utils/blockchain';
import { MONEY_TRANSFER_STATUS } from './constants';
import * as kusama from '../utils/blockchain/kusama';
import * as util from '../utils/blockchain/util';

const kusamaBlockMethods = {
  METHOD_TRANSFER_KEEP_ALIVE: 'transferKeepAlive',
  METHOD_TRANSFER: 'transfer',
  METHOD_TRANSFER_FROM: 'transferFrom',
};

export class KusamaEscrow extends Escrow {
  SECTION_BALANCES = 'balances';
  adminAddress;

  async init() {
    this.initialized = true;
    this.api = await kusama.connectApi(this.config('kusama.wsEndpoint'), this.configMode === Escrow.MODE_PROD);
    this.admin = util.privateKey(this.config('escrowSeed'));
    this.adminAddress = new Keyring({
      type: 'sr25519',
      ss58Format: this.config('kusama.ss58Format'),
    }).addFromUri(this.config('escrowSeed')).address;
  }

  async destroy() {
    if (!this.initialized) return;
    await this.api.disconnect();
  }

  async getBalance(address: string) {
    return BigInt((await this.api.query.system.account(address)).data.free.toJSON());
  }

  async transfer(sender: IKeyringPair, recipient: string, amountBN: bigint) {
    const senderBalance = await this.getBalance(sender.address);
    const recipientBalance = await this.getBalance(recipient);
    logging.log([
      'Transfer start from',
      sender.address,
      'to',
      recipient,
      'amount',
      amountBN.toString(),
      'total sender balance',
      senderBalance.toString(),
      'total recipient balance',
      recipientBalance.toString(),
    ]);

    if (senderBalance < amountBN) {
      const error = `Sender balance ${senderBalance.toString()} is insufficient to send ${amountBN.toString()} to ${recipient.toString()}.`;
      logging.log(error, logging.level.ERROR);
      throw error;
    }

    const balanceTransaction = this.api.tx.balances.transfer(recipient, amountBN.toString());
    const result = (await signTransaction(sender, balanceTransaction, 'api.tx.balances.transfer')) as any;
    if (result.status !== TransactionStatus.SUCCESS) throw Error('Transfer failed');
    logging.log([
      'Transfer successful. Sender balance:',
      (await this.getBalance(sender.address)).toString(),
      ' Recipient balance:',
      (await this.getBalance(recipient)).toString(),
    ]);
  }

  getNetwork(): string {
    return this.config('kusama.network');
  }

  async extractBlockData(blockNum, isSuccess, rawExtrinsic) {
    if (rawExtrinsic.method.section !== this.SECTION_BALANCES) {
      return;
    }
    let method = rawExtrinsic.method.method;
    if ([kusamaBlockMethods.METHOD_TRANSFER_KEEP_ALIVE].indexOf(method) > -1) method = kusamaBlockMethods.METHOD_TRANSFER;
    const toAddress = rawExtrinsic.method.args[0].toString();
    if (method !== kusamaBlockMethods.METHOD_TRANSFER || toAddress !== this.adminAddress) return;
    const amount = rawExtrinsic.method.args[1].toString();
    const address = encodeAddress(decodeAddress(rawExtrinsic.signer.toString()));
    if (!isSuccess) {
      logging.log(`Kusama deposit (from ${address}, amount ${amount}) in block #${blockNum} failed`);
      return;
    }
    await this.service.modifyContractBalance(amount, address, blockNum, this.getNetwork());
    logging.log(`Kusama deposit (from ${address}, amount ${amount}) in block #${blockNum} saved to db`);
  }

  async processWithdraw() {
    while (true) {
      const withdraw = await this.service.getPendingKusamaWithdraw(this.getNetwork());
      if (!withdraw) break;
      try {
        logging.log(`Kusama withdraw for money transfer #${withdraw.id} started`);
        const amountReturned = BigInt(withdraw.amount);

        await this.service.updateMoneyTransferStatus(withdraw.id, MONEY_TRANSFER_STATUS.IN_PROGRESS);

        await this.transfer(this.admin, withdraw.extra.address, amountReturned);
        await this.service.updateMoneyTransferStatus(withdraw.id, MONEY_TRANSFER_STATUS.COMPLETED);
        logging.log(`Kusama withdraw for money transfer #${withdraw.id} successful`);
      } catch (e) {
        await this.service.updateMoneyTransferStatus(withdraw.id, MONEY_TRANSFER_STATUS.FAILED);
        logging.log(`Kusama withdraw for money transfer #${withdraw.id} failed`, logging.level.ERROR);
        logging.log(e, logging.level.ERROR);
      }
    }
  }

  getStartFromBlock(): number | string {
    return this.config('kusama.startFromBlock');
  }

  async processBlock(blockNum, force = false) {
    try {
      await this.scanBlock(blockNum, force);
    } catch (e) {
      let currentHead = null;
      try {
        currentHead = await this.getLatestBlockNumber();
      } catch (ex) {}
      if (e.toString().indexOf('Unable to retrieve header and parent from supplied hash') > -1) {
        // TODO: check this. Subscribe send blocks greater then currentHead
        // Only full restart helps
        logging.log(`Invalid block from subscribe, got #${blockNum} while current head is #${currentHead}`, logging.level.ERROR);
        process.exit(1);
      }
      logging.log(`Unable to scan block #${blockNum} (current head ${currentHead}) (WTF?)`, logging.level.ERROR);
      logging.log(e, logging.level.ERROR);
    }
    await this.processWithdraw();
  }

  prepareLatestBlock(blockNum): any {
    return blockNum - this.config('kusama.waitBlocks');
  }

  async work() {
    if (!this.initialized) throw Error('Unable to start uninitialized escrow. Call "await escrow.init()" before work');
    this.store.currentBlock = await this.getStartBlock();
    this.store.latestBlock = (await this.getLatestBlockNumber()) - this.config('kusama.waitBlocks');
    logging.log(
      `Kusama escrow starting from block #${this.store.currentBlock} (mode: ${this.config('kusama.startFromBlock')}, maxBlock: ${this.store.latestBlock})`,
    );
    logging.log(`Kusama admin address: ${this.admin.address}`);
    logging.log(`Kusama admin address (kusama format): ${this.adminAddress}`);
    await this.subscribe();
    await this.mainLoop();
  }

  async beforeBlockScan(): Promise<void> {
    return;
  }
}
