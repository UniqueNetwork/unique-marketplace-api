import { BadRequestException, Inject, Logger } from '@nestjs/common';
import { Connection, Not, Repository } from 'typeorm';
import { BidEntity } from '../entities';
import { BlockchainBlock, ContractAsk } from '../../entity';
import { BroadcastService } from '../../broadcast/services/broadcast.service';
import { ApiPromise } from '@polkadot/api';
import { MarketConfig } from '../../config/market-config';
import { ExtrinsicSubmitter } from './extrinsic-submitter';
import { OfferContractAskDto } from '../../offers/dto/offer-dto';
import { ASK_STATUS } from '../../escrow/constants';
import { privateKey } from '../../utils/blockchain/util';
import { DatabaseHelper } from './database-helper';
import { AuctionStatus, BidStatus } from '../types';

type AuctionCancelArgs = {
  collectionId: number;
  tokenId: number;
  ownerAddress: string;
};

export class AuctionCancellingService {
  private readonly logger = new Logger(AuctionCancellingService.name);

  private readonly blockchainBlockRepository: Repository<BlockchainBlock>;
  private readonly contractAskRepository: Repository<ContractAsk>;

  constructor(
    @Inject('DATABASE_CONNECTION') private connection: Connection,
    private broadcastService: BroadcastService,
    @Inject('UNIQUE_API') private uniqueApi: ApiPromise,
    @Inject('CONFIG') private config: MarketConfig,
    private readonly extrinsicSubmitter: ExtrinsicSubmitter,
  ) {
    this.contractAskRepository = connection.getRepository(ContractAsk);
    this.blockchainBlockRepository = connection.getRepository(BlockchainBlock);
  }

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

  private cancelInDatabase(args: AuctionCancelArgs): Promise<ContractAsk> {
    const { collectionId, tokenId, ownerAddress } = args;

    return this.connection.transaction<ContractAsk>(async (transactionEntityManager) => {
      const databaseHelper = new DatabaseHelper(transactionEntityManager);
      const contractAsk = await databaseHelper.getActiveAuctionContract({ collectionId, tokenId });

      if (contractAsk.address_from !== ownerAddress) {
        throw new Error(`You are not an owner. Owner is ${contractAsk.address_from}, your address is ${ownerAddress}`);
      }

      const bidsCount = await transactionEntityManager.count(BidEntity, {
        where: { auctionId: contractAsk.auction.id, status: Not(BidStatus.error) },
      });

      if (bidsCount !== 0) {
        throw new Error(`Unable to cancel auction, ${bidsCount} bids is placed already`);
      }

      contractAsk.status = ASK_STATUS.CANCELLED;
      await transactionEntityManager.update(ContractAsk, contractAsk.id, { status: ASK_STATUS.CANCELLED });

      return contractAsk;
    });
  }

  async sendTokenBackToOwner(contractAsk: ContractAsk): Promise<void> {
    try {
      const { address_from, collection_id, token_id } = contractAsk;
      const auctionKeyring = privateKey(this.config.auction.seed);

      const tx = await this.uniqueApi.tx.unique.transfer(address_from, collection_id, token_id, 1).signAsync(auctionKeyring);

      const signedBlock = await this.extrinsicSubmitter.submit(this.uniqueApi, tx);

      const block = this.blockchainBlockRepository.create({
        network: this.config.blockchain.unique.network,
        block_number: signedBlock?.block.header.number.toString() || 'no_number',
        created_at: new Date(),
      });

      contractAsk.block_number_cancel = block.block_number;

      await this.blockchainBlockRepository.save(block);
      await this.contractAskRepository.save(contractAsk);
    } catch (error) {
      this.logger.error(error);
    }
  }
}
