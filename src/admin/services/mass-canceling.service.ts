import { Injectable, Inject, Logger, BadRequestException, HttpStatus, OnModuleInit } from '@nestjs/common';
import { Connection, In, IsNull, Not, Repository } from 'typeorm';
import { Keyring } from '@polkadot/api';
import { KeyringPair } from '@polkadot/keyring/types';
import { Collection, OffersEntity } from '../../entity';
import { MarketConfig } from '../../config/market-config';
import { AuctionStatus, SellingMethod } from '../../types';
import { ASK_STATUS } from '../../escrow/constants';
import { MassCancelResult } from '../dto';

@Injectable()
export class MassCancelingService {
  private readonly logger: Logger;
  private readonly offersEntityRepository: Repository<OffersEntity>;
  private readonly collectionRepository: Repository<Collection>;

  constructor(@Inject('DATABASE_CONNECTION') private connection: Connection, @Inject('CONFIG') private config: MarketConfig) {
    this.logger = new Logger(MassCancelingService.name);
    this.offersEntityRepository = connection.getRepository(OffersEntity);
    this.collectionRepository = connection.getRepository(Collection);
  }

  /**
   * Cancel ALL secondary market offers
   * For fix price offers dont cancel asks in smart contract, just set status to 'removed_by_admin'
   * For auction offers set stop date to current time and finish auctions
   * @return ({Promise<MassCancelResult>})
   */
  async massCancel(): Promise<MassCancelResult> {
    const fixPrice = await this.massFixPriceCancel();
    const auction = await this.massAuctionCancel();

    const count = fixPrice + auction;

    if (count === 0) throw new BadRequestException('No offers for cancel');

    const message = `${count} offers successfully canceled`;

    return {
      statusCode: HttpStatus.OK,
      message,
    };
  }

  /**
   * Mass cancel all offers and auctions
   * @return ({Promise<MassCancelResult>})
   */
  async massCancelSystem(): Promise<MassCancelResult> {
    const fixPrice = await this.massFixPriceCancel();
    const auction = await this.massAuctionCancel();

    const count = fixPrice + auction;

    if (count === 0) {
      this.logger.error('No offers for cancel');
      return;
    }

    const message = `${count} offers successfully canceled`;

    return {
      statusCode: HttpStatus.OK,
      message,
    };
  }

  /**
   * Cancel ALL secondary market fix price offers
   * Dont cancel contract asks in smart contract, just set status to 'removed_by_admin'
   * @return ({Promise<number>})
   */
  async massFixPriceCancel(): Promise<number> {
    const signer = this.getSigner();

    const offersEntities = await this.offersEntityRepository.find({
      where: {
        type: SellingMethod.FixedPrice,
        address_from: Not(signer.address),
        status: ASK_STATUS.ACTIVE,
      },
    });

    const offersId = offersEntities.map((ask) => ask.id);

    const { affected } = await this.offersEntityRepository.update(
      {
        id: In(offersId),
      },
      {
        status: ASK_STATUS.REMOVED_BY_ADMIN,
      },
    );

    return affected;
  }

  /**
   * Cancel ALL secondary market auction offers
   * Set stop date to current time and finish auctions
   * @return ({Promise<number>})
   */
  async massAuctionCancel(): Promise<number> {
    const signer = this.getSigner();

    const auctions = await this.offersEntityRepository.find({
      where: {
        type: SellingMethod.Auction,
        address_from: Not(signer.address),
        status_auction: AuctionStatus.active,
      },
    });

    const auctionIds = auctions.map((auction) => auction.id);

    const { affected } = await this.offersEntityRepository.update(
      {
        id: In(auctionIds),
      },
      {
        stopAt: new Date(),
      },
    );

    return affected;
  }

  /**
   * Checking for Allowed Tokens
   */
  async allowedTokensInList(collectionId: number): Promise<number[]> {
    const collection = await this.collectionRepository.findOne({
      where: { id: collectionId },
    });
    const allowedList = [];
    const allowedTokenArray = collection.allowedTokens.match(/[^(,\s]+|\([^)]+\)/g);

    for (const token of allowedTokenArray) {
      const rangeNumber = token.match(/\d+/g);
      if (rangeNumber.length === 2) {
        const rangeN = rangeNumber.map((number) => parseInt(number));
        allowedList.push(...this.range(rangeN[0], rangeN[1]));
      } else {
        allowedList.push(parseInt(token));
      }
    }

    return allowedList;
  }

  range(start, end) {
    const list = [];
    for (let i = start; i < end + 1; i++) {
      list.push(parseInt(i));
    }
    return list;
  }

  /**
   * Return main sale seed keyring
   * @return ({KeyringPair})
   */
  private getSigner(): KeyringPair {
    const keyring = new Keyring({ type: 'sr25519' });

    const { mainSaleSeed } = this.config;

    if (!mainSaleSeed) throw new BadRequestException('Main sale seed not set');

    const signer = keyring.addFromUri(mainSaleSeed);

    return signer;
  }
}
