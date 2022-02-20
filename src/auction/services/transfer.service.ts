import { signTransaction } from '../../utils/blockchain/polka';
import * as util from '../../utils/blockchain/util';
import { convertAddress, seedToAddress } from '../../utils/blockchain/util';
import { ApiPromise } from '@polkadot/api';
import { Inject, Injectable, OnModuleInit } from "@nestjs/common";
import { MarketConfig } from '../../config/market-config';

@Injectable()
export class TransferService implements OnModuleInit {

  private marketAuctionUniqueAddress: string;
  private marketAuctionKusamaAddress: string;

  constructor(
    @Inject('KUSAMA_API') private kusamaApi: ApiPromise,
    @Inject('UNIQUE_API') private uniqueApi: ApiPromise,
    @Inject('CONFIG') private config: MarketConfig,
  ) { }

  async trasferToken(collectionId: number, tokenId: number, recipient: string): Promise<void> {
    await signTransaction(
      this.marketAuctionUniqueAddress,
      this.uniqueApi.tx.unique.transfer(
        util.normalizeAccountId({
          Substrate: recipient
        }),
        collectionId,
        tokenId, 1
      ),
      'api.tx.unique.transfer'
    );
  }

  async sendMoney(recipient: string, amountBN: string, fee = '0') {

    const kusamaRecipinet = await convertAddress(recipient, this.kusamaApi.registry.chainSS58);

    //const commission = BigInt(100 + parseInt(fee));

    //const amountWith = (amountBN * 100n) / commission;

    await signTransaction(
      this.marketAuctionKusamaAddress,
      this.kusamaApi.tx.balances.transfer(
        kusamaRecipinet,
        amountBN.toString()
      ),
      'api.tx.balances.transfer'
    )
  }

  async onModuleInit(): Promise<void> {
    if (this.config.auction.seed) {
      const address = await seedToAddress(this.config.auction.seed);

      this.marketAuctionKusamaAddress = await convertAddress(address, this.kusamaApi.registry.chainSS58);
      this.marketAuctionUniqueAddress = await convertAddress(address, this.uniqueApi.registry.chainSS58);
    }
  }
}