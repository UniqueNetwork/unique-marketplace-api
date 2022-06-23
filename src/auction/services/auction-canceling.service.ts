import { BadRequestException, Inject, Logger } from '@nestjs/common';
import { Connection, Not, Repository } from 'typeorm';
import { AuctionEntity, BidEntity } from '../entities';
import { BlockchainBlock, ContractAsk } from '../../entity';
import { BroadcastService } from '../../broadcast/services/broadcast.service';
import { ApiPromise } from '@polkadot/api';
import { MarketConfig } from '../../config/market-config';
import { ExtrinsicSubmitter } from './helpers/extrinsic-submitter';
import { OfferContractAskDto } from '../../offers/dto/offer-dto';
import { ASK_STATUS } from '../../escrow/constants';
import { DatabaseHelper } from './helpers/database-helper';
import { AuctionStatus, BidStatus } from '../types';
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
  private readonly contractAskRepository: Repository<ContractAsk>;

  constructor(
    @Inject('DATABASE_CONNECTION') private connection: Connection,
    private broadcastService: BroadcastService,
    @InjectUniqueAPI() private uniqueApi: ApiPromise,
    @Inject('CONFIG') private config: MarketConfig,
    @Inject('AUCTION_CREDENTIALS') private auctionCredentials: AuctionCredentials,
    private readonly extrinsicSubmitter: ExtrinsicSubmitter,
    @InjectSentry() private readonly sentryService: SentryService,
  ) {
    this.contractAskRepository = connection.getRepository(ContractAsk);
    this.blockchainBlockRepository = connection.getRepository(BlockchainBlock);
  }

  /**
   * Try Cancel Auction
   * @param args
   */
  async tryCancelAuction(args: AuctionCancelArgs): Promise<OfferContractAskDto> {
    let cancelledContractAsk: ContractAsk;

    try {
      cancelledContractAsk = await this.cancelInDatabase(args);

      return OfferContractAskDto.fromContractAsk(cancelledContractAsk);
    } catch (error) {
      throw new BadRequestException(error.message);
    } finally {
      if (cancelledContractAsk) await this.sendTokenBackToOwner(cancelledContractAsk);
    }
  }

  /**
   * Cancel auction in database
   * @param args
   * @private
   */
  private cancelInDatabase(args: AuctionCancelArgs): Promise<ContractAsk> {
    const { collectionId, tokenId, ownerAddress } = args;

    return this.connection.transaction<ContractAsk>('REPEATABLE READ', async (transactionEntityManager) => {
      const databaseHelper = new DatabaseHelper(transactionEntityManager);
      const contractAsk = await databaseHelper.getActiveAuctionContract({ collectionId, tokenId });

      if (contractAsk.address_from !== encodeAddress(ownerAddress)) {
        this.logger.error(`You are not an owner. Owner is ${contractAsk.address_from}, your address is ${ownerAddress}`);
        throw new Error(`You are not an owner. Owner is ${contractAsk.address_from}, your address is ${ownerAddress}`);
      }

      const bidsCount = await transactionEntityManager.count(BidEntity, {
        where: { auctionId: contractAsk.auction.id, status: Not(BidStatus.error) },
      });

      if (bidsCount !== 0) {
        this.logger.error(`Unable to cancel auction, ${bidsCount} bids is placed already`);
        throw new Error(`Unable to cancel auction, ${bidsCount} bids is placed already`);
      }

      contractAsk.status = ASK_STATUS.CANCELLED;
      await transactionEntityManager.update(ContractAsk, contractAsk.id, { status: ASK_STATUS.CANCELLED });
      this.logger.debug(`Update offer id:${contractAsk.id}  status: 'CANCELLED' `);
      await transactionEntityManager.update(AuctionEntity, contractAsk.auction.id, {
        stopAt: new Date(),
        status: AuctionStatus.ended,
      });

      const canceledAuctionLog = {
        subject: 'Canceled auction',
        collection: collectionId,
        token: tokenId,
        status: AuctionStatus.ended,
        stopAt: new Date(),
        bidsCount: bidsCount,
        address_from: contractAsk.address_from,
        ownerAddress: ownerAddress,
        n42: {
          address_from: encodeAddress(contractAsk.address_from),
          ownerAddress: encodeAddress(ownerAddress),
        },
        contract_ask_auction: contractAsk.auction.id,
      };

      this.logger.debug(JSON.stringify(canceledAuctionLog));
      return contractAsk;
    });
  }

  /**
   * Send Token to Owner
   * @param {ContractAsk} contractAsk
   */
  async sendTokenBackToOwner(contractAsk: ContractAsk): Promise<void> {
    try {
      const { address_from, collection_id, token_id } = contractAsk;
      const auctionKeyring = this.auctionCredentials.keyring;

      const nonce = await this.uniqueApi.rpc.system.accountNextIndex(auctionKeyring.address);

      const tx = await this.uniqueApi.tx.unique.transfer({ Substrate: address_from }, collection_id, token_id, 1).signAsync(auctionKeyring, { nonce });

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

      contractAsk.block_number_cancel = block.block_number;

      await this.connection.createQueryBuilder().insert().into(BlockchainBlock).values(block).orIgnore().execute();
      await this.contractAskRepository.save(contractAsk);

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
