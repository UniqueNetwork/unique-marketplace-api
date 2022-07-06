import { Inject, Injectable } from '@nestjs/common';
import * as lib from '../../utils/blockchain/web3';
import { MarketConfig } from '../../config/market-config';
import * as unique from '../../utils/blockchain/unique';
import { evmToAddress } from '@polkadot/util-crypto';
import * as util from '../../utils/blockchain/util';
import * as logging from '../../utils/logging';
import { signTransaction, TransactionStatus } from '../../utils/blockchain';

@Injectable()
export class DeployContractService {
  private summary: string[] = [];
  private web3conn;
  private api;
  private web3;
  private ownerSeed: string;

  private DEPLOY_COST = 9n * lib.UNIQUE;
  private CONTRACT_MIN_BALANCE = 40n * lib.UNIQUE;
  private ESCROW_MIN_BALANCE = (5n * lib.UNIQUE) / 10n;

  constructor(@Inject('CONFIG') private config: MarketConfig) {
    this.web3conn = lib.connectWeb3(config.blockchain.unique.wsEndpoint);

    this.web3 = this.web3conn.web3;
    this.ownerSeed = config.blockchain.unique.contractOwnerSeed;
  }

  /**
   * Initialize the service.
   */
  async init() {
    if (this.config.blockchain.escrowSeed === null) {
      logging.log('You need to set ESCROW_SEED env or override config "blockchain.escrowSeed" section');
      return;
    }

    logging.log(['WS endpoint:', this.config.blockchain.unique.wsEndpoint]);
    this.api = await unique.connectApi(this.config.blockchain.unique.wsEndpoint, false);
  }
  numberWithCommas(x) {
    return x.toString().replace(/\B(?=(\d{18})+(?!\d))/g, ',');
  }
  /**
   * Disconnect the service.
   * @private
   */
  private async disconnect() {
    const api = await this.api;
    if (this.summary.length) {
      console.log(`\n\n\nSUMMARY:\n\n${this.summary.join('\n')}`);
    }
    this.web3conn.provider.connection.close();
    await api.disconnect();
    process.exit(0);
  }
  private async getBalance(address) {
    const api = await this.api;
    return ((await api.query.system.account(address)) as any).data.free.toBigInt();
  }
  private async addSubstrateMirror(address) {
    this.summary.push(`\n\nSubstrate mirror of contract address (for balances): ${evmToAddress(address)}`);
    this.summary.push(`Current contract balance: ${this.numberWithCommas(await this.getBalance(evmToAddress(address)))}`);
  }

  /**
   * Deploy the contract.
   */
  async deploy() {
    const api = await this.api;
    const escrow = util.privateKey(this.config.blockchain.escrowSeed);

    logging.log(['Escrow substrate address:', escrow.address]);
    {
      const balance = await this.getBalance(escrow.address);
      logging.log(['Balance on escrow:', this.numberWithCommas(balance.toString())]);
    }
    if (this.config.blockchain.unique.contractOwnerSeed === null) {
      logging.log('No existed CONTRACT_ETH_OWNER_SEED, creating new eth account');
      const balance = await this.getBalance(escrow.address);
      const minBalance = this.CONTRACT_MIN_BALANCE + this.ESCROW_MIN_BALANCE + this.DEPLOY_COST;
      if (balance < minBalance) {
        logging.log(['Balance on account', escrow.address, 'too low to create eth account. Need at least', minBalance.toString()]);
        return await this.disconnect();
      }
      const account = this.web3.eth.accounts.create();

      const result = await signTransaction(
        escrow,
        api.tx.balances.transfer(evmToAddress(account.address), this.DEPLOY_COST),
        'api.tx.balances.transfer',
      );
      if (result.status !== TransactionStatus.SUCCESS) {
        logging.log(
          ['Unable to transfer', this.DEPLOY_COST.toString(), 'from', escrow.address, 'to', evmToAddress(account.address)],
          logging.level.ERROR,
        );
        logging.log(result.result.toHuman(), logging.level.ERROR);
        return await this.disconnect();
      }

      logging.log(['Your new eth account seed:', account.privateKey]);
      logging.log(['Your new eth account address:', account.address]);
      logging.log('Set it to CONTRACT_ETH_OWNER_SEED env or override config "blockchain.unique.contractOwnerSeed" section');
      this.ownerSeed = account.privateKey;
    }
    this.summary.push(`CONTRACT_ETH_OWNER_SEED: '${this.ownerSeed}'`);
    if (this.config.blockchain.unique.contractAddress !== null) {
      logging.log(
        'Contract already deployed. Check your CONTRACT_ADDRESS env or "blockchain.unique.contractAddress" config section',
        logging.level.WARNING,
      );

      this.summary.push(`CONTRACT_ADDRESS: '${this.config.blockchain.unique.contractAddress}'`);
      await this.addSubstrateMirror(this.config.blockchain.unique.contractAddress);

      return await this.disconnect();
    }
    const balance = await this.getBalance(escrow.address);
    const minBalance = this.CONTRACT_MIN_BALANCE + this.ESCROW_MIN_BALANCE;
    if (balance < minBalance) {
      logging.log(
        ['Balance on account', escrow.address, 'too low to deploy contract. Need at least', minBalance.toString()],
        logging.level.WARNING,
      );
      return await this.disconnect();
    }
    logging.log('Deploy contract...');
    const account = this.web3.eth.accounts.privateKeyToAccount(this.ownerSeed);
    this.web3.eth.accounts.wallet.add(account.privateKey);

    const contractAbi = new this.web3.eth.Contract(JSON.parse(util.blockchainStaticFile('MarketPlace.abi')), undefined, {
      from: account.address,
      ...lib.GAS_ARGS,
    });
    const contract = await contractAbi
      .deploy({ data: util.blockchainStaticFile('MarketPlace.bin') })
      .send({ from: account.address, gas: 5_000_000 });
    logging.log('Set escrow...');
    await contract.methods.setEscrow(account.address, true).send({ from: account.address });
    const helpers = lib.contractHelpers(this.web3, account.address);
    logging.log('Set sponsoring mode...');
    // await helpers.methods.toggleSponsoring(contract.options.address, true).send({from: account.address});
    await helpers.methods.setSponsoringMode(contract.options.address, lib.SponsoringMode.Allowlisted).send({ from: account.address });
    logging.log('Set sponsoring rate limit...');
    await helpers.methods.setSponsoringRateLimit(contract.options.address, 0).send({ from: account.address });
    logging.log('Transfer balance...');
    const result = await signTransaction(
      escrow,
      api.tx.balances.transfer(evmToAddress(contract.options.address), this.CONTRACT_MIN_BALANCE),
      'api.tx.balances.transfer',
    );
    if (result.status !== TransactionStatus.SUCCESS) {
      logging.log(
        ['Unable to transfer', this.CONTRACT_MIN_BALANCE.toString(), 'from', escrow.address, 'to', evmToAddress(contract.options.address)],
        logging.level.ERROR,
      );
      logging.log(result.result.toHuman(), logging.level.ERROR);
      return await this.disconnect();
    }
    logging.log('All done');
    logging.log(['Your new contract address:', contract.options.address]);
    logging.log('Set it to CONTRACT_ADDRESS env or override config "blockchain.unique.contractAddress"');
    this.summary.push(`CONTRACT_ADDRESS: '${contract.options.address}'`);
    await this.addSubstrateMirror(contract.options.address);

    return await this.disconnect();
  }
}
