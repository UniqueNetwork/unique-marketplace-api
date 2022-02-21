import { IKeyringPair } from '@polkadot/types/types';
import { signTransaction, transactionStatus } from '../../utils/blockchain/polka';
import { convertAddress, privateKey, normalizeAccountId } from '../../utils/blockchain/util';
import { seedToAddress } from '../../utils/blockchain/util';
import { ApiPromise } from '@polkadot/api';
import { Inject, Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { MarketConfig } from '../../config/market-config';

@Injectable()
export class TransferService implements OnModuleInit {

  private readonly logger = new Logger(TransferService.name);

  private sender: IKeyringPair;

  constructor(
    @Inject('KUSAMA_API') private kusamaApi: ApiPromise,
    @Inject('UNIQUE_API') private uniqueApi: ApiPromise,
    @Inject('CONFIG') private config: MarketConfig,
  ) { }

  async trasferToken(collectionId: number, tokenId: number, recipient: string): Promise<void> {
    const  addressRecipient = await convertAddress(recipient, this.uniqueApi.registry.chainSS58);

    const transferToken = this.uniqueApi.tx.unique.transfer(
      normalizeAccountId({
        Substrate: addressRecipient
      }),
      collectionId,
      tokenId, 1
    );

    const result = (await signTransaction(
      this.sender,
      transferToken,
      'api.tx.unique.transfer'
    )) as any;

    if (result.status !== transactionStatus.SUCCESS) throw Error('Transfer failed');

  }

  async getBalance(address: string) {
    return BigInt((await this.kusamaApi.query.system.account(address)).data.free.toJSON());
  }


  async sendMoney(recipient: string, amountBN: string, fee = '0') {


    //const commission = BigInt(100 + parseInt(fee));

    //const amountWith = (amountBN * 100n) / commission;

    //await seedToAddress(this.config.auction.seed);

    const balanceTransaction = this.kusamaApi.tx.balances.transferKeepAlive(recipient, amountBN);

    const result = (await signTransaction(
      this.sender,
      balanceTransaction,
      'api.tx.balances.transferKeepAlive'
    )) as any;

    if (result.status !== transactionStatus.SUCCESS) throw Error('Transfer failed');

    this.logger.log([
      'Transfer successful. Sender balance:',
      (await this.getBalance(this.sender.address)).toString(),
      ' Recipient balance:',
      (await this.getBalance(recipient)).toString(),
    ]);
  }

  async onModuleInit(): Promise<void> {
    if (this.config.auction.seed) {
      const address = await seedToAddress(this.config.auction.seed);
      this.sender = privateKey(this.config.auction.seed);
    }
  }
}