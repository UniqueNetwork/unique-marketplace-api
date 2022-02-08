import { Keyring } from "@polkadot/api";
import { Inject, Injectable } from '@nestjs/common';

import { SettingsDto } from './dto/settings.dto';
import { MarketConfig } from "../config/market-config";

@Injectable()
export class SettingsService {
  private preparedSettings?: SettingsDto;

  constructor(
    @Inject('CONFIG') private config: MarketConfig,
  ) {}

  get settings(): SettingsDto {
    if (this.preparedSettings) return this.preparedSettings;

    const { blockchain, auction } = this.config;

    const auctionAddress = auction.seed
      ? new Keyring({ type: 'sr25519' }).addFromUri(auction.seed).address
      : '';

    const auctionPart = auctionAddress ? {
      address: auctionAddress,
      commission: auction.commission,
    } : undefined;

    this.preparedSettings = {
      blockchain: {
        unique: {
          wsEndpoint: blockchain.unique.wsEndpoint,
          collectionIds: blockchain.unique.collectionIds,
          contractAddress: blockchain.unique.contractAddress,
        },
        kusama: {
          wsEndpoint: blockchain.kusama.wsEndpoint,
          marketCommission: blockchain.kusama.marketCommission.toString(),
        },
      },
      auction: auctionPart,
    };

    return this.preparedSettings;
  }
}
