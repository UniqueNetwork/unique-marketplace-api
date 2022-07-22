import { BadRequestException, Inject, Logger } from '@nestjs/common';
import { Connection, FindOperator, Not, Repository } from 'typeorm';
import { AuctionBidEntity, BlockchainBlock, OffersEntity } from '../../entity';
import { BroadcastService } from '../../broadcast/services/broadcast.service';
import { ApiPromise } from '@polkadot/api';
import { MarketConfig } from '../../config/market-config';
import { ExtrinsicSubmitter } from './helpers/extrinsic-submitter';
import { OfferEntityDto } from '../../offers/dto/offer-dto';
import { ASK_STATUS } from '../../escrow/constants';
import { DatabaseHelper } from './helpers/database-helper';
import { AuctionStatus, BidStatus } from '../../types';
import { AuctionCredentials } from '../providers';
import { encodeAddress } from '@polkadot/util-crypto';
import { InjectSentry, SentryService } from '../../utils/sentry';
import { InjectUniqueAPI } from '../../blockchain';

type AuctionCancelArgs = {
  collectionId: number;
  tokenId: number;
  ownerAddress: string;
};

export class AuctionCancelingService {
  private readonly logger = new Logger(AuctionCancelingService.name);

  private readonly blockchainBlockRepository: Repository<BlockchainBlock>;
  private readonly offersRepository: Repository<OffersEntity>;

  constructor(
    @Inject('DATABASE_CONNECTION') private connection: Connection,
    private broadcastService: BroadcastService,
    @InjectUniqueAPI() private uniqueApi: ApiPromise,
    @Inject('CONFIG') private config: MarketConfig,
    @Inject('AUCTION_CREDENTIALS') private auctionCredentials: AuctionCredentials,
    private readonly extrinsicSubmitter: ExtrinsicSubmitter,
    @InjectSentry() private readonly sentryService: SentryService,
  ) {
    this.offersRepository = connection.getRepository(OffersEntity);
    this.blockchainBlockRepository = connection.getRepository(BlockchainBlock);
  }

  /**
   * Try Cancel Auction
   * @param args
   */
  async tryCancelAuction(args: AuctionCancelArgs): Promise<OfferEntityDto> {
    let cancelledOffers: OffersEntity;

    try {
      cancelledOffers = await this.cancelInDatabase(args);

      return OfferEntityDto.fromOffersEntity(cancelledOffers);
    } catch (error) {
      throw new BadRequestException(error.message);
    } finally {
      if (cancelledOffers) await this.sendTokenBackToOwner(cancelledOffers);
    }
  }

  /**
   * Cancel auction in database
   * @param args
   * @private
   */
  private cancelInDatabase(args: AuctionCancelArgs): Promise<OffersEntity> {
    const { collectionId, tokenId, ownerAddress } = args;

    return this.connection.transaction<OffersEntity>('REPEATABLE READ', async (transactionEntityManager) => {
      const databaseHelper = new DatabaseHelper(transactionEntityManager);
      const auctionData = await databaseHelper.getActiveAuction({ collectionId, tokenId });

      if (auctionData.address_from !== encodeAddress(ownerAddress)) {
        this.logger.error(`You are not an owner. Owner is ${auctionData.address_from}, your address is ${ownerAddress}`);
        throw new Error(`You are not an owner. Owner is ${auctionData.address_from}, your address is ${ownerAddress}`);
      }

      const status = Not(BidStatus.error) as FindOperator<BidStatus> & BidStatus;
      const bidsCount = await transactionEntityManager.count(AuctionBidEntity, {
        where: { auctionId: auctionData.id, status: status },
      });

      if (bidsCount !== 0) {
        this.logger.error(`Unable to cancel auction, ${bidsCount} bids is placed already`);
        throw new Error(`Unable to cancel auction, ${bidsCount} bids is placed already`);
      }

      auctionData.status = ASK_STATUS.CANCELLED;
      await transactionEntityManager.update(OffersEntity, auctionData.id, {
        status: ASK_STATUS.CANCELLED,
        stopAt: new Date(),
        status_auction: AuctionStatus.ended,
      });
      this.logger.debug(`Update offer id:${auctionData.id}  status: 'CANCELLED' `);

      const canceledAuctionLog = {
        subject: 'Canceled auction',
        message: `Auction ${auctionData.id} was canceled`,
        collection: collectionId,
        token: tokenId,
        status_auction: AuctionStatus.ended,
        stopAt: new Date(),
        bidsCount: bidsCount,
        address_from: auctionData.address_from,
        ownerAddress: ownerAddress,
      };

      this.logger.debug(JSON.stringify(canceledAuctionLog));
      return auctionData;
    });
  }

  /**
   * Send Token to Owner
   * @param {OffersEntity} OffersEntity
   */
  async sendTokenBackToOwner(OffersEntity: OffersEntity): Promise<void> {
    try {
      const { address_from, collection_id, token_id } = OffersEntity;
      const auctionKeyring = this.auctionCredentials.keyring;

      const nonce = await this.uniqueApi.rpc.system.accountNextIndex(auctionKeyring.address);

      const tx = await this.uniqueApi.tx.unique
        .transfer({ Substrate: address_from }, collection_id, token_id, 1)
        .signAsync(auctionKeyring, { nonce });

      const { blockNumber } = await this.extrinsicSubmitter.submit(this.uniqueApi, tx);

      if (blockNumber === undefined || blockNumber === null || blockNumber.toString() === '0') {
        this.sentryService.message('sendTokenBackToOwner');
        throw new Error('Block number is not defined');
      }

      const block = this.blockchainBlockRepository.create({
        network: this.config.blockchain.unique.network,
        block_number: blockNumber.toString(),
        created_at: new Date(),
      });

      OffersEntity.block_number_cancel = block.block_number;

      await this.connection.createQueryBuilder().insert().into(BlockchainBlock).values(block).orIgnore().execute();
      await this.offersRepository.save(OffersEntity);

      const sendTokenDataLog = {
        subject: 'Send token back to owner',
        thread: 'auction canceling',
        address_from: address_from,
        address_from_n42: encodeAddress(address_from),
        collection: collection_id,
        token: token_id,
        auction_seed: auctionKeyring.address,
        auction_seed_n42: encodeAddress(auctionKeyring.address),
        network: this.config.blockchain.unique.network,
        block_number: block.block_number,
      };

      this.logger.debug(JSON.stringify(sendTokenDataLog));
    } catch (error) {
      this.logger.error(error);
    }
  }
}
