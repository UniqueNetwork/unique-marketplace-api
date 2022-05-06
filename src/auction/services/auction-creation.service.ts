
import { encodeAddress } from '@polkadot/util-crypto';
import { BadRequestException, HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { AuctionStatus } from '../types';
import { Connection, Repository } from 'typeorm';
import { AuctionEntity } from '../entities';
import { BroadcastService } from '../../broadcast/services/broadcast.service';
import { AccountPairs, BlockchainBlock, ContractAsk } from '../../entity';
import { v4 as uuid } from 'uuid';
import { ASK_STATUS } from '../../escrow/constants';
import { OfferContractAskDto } from '../../offers/dto/offer-dto';
import { ApiPromise } from '@polkadot/api';
import { DateHelper } from '../../utils/date-helper';
import { ExtrinsicSubmitter } from './helpers/extrinsic-submitter';
import { MarketConfig } from '../../config/market-config';
import { SearchIndexService } from './search-index.service';
import { AuctionCredentials } from '../providers';
import { InjectSentry, SentryService } from 'src/utils/sentry';

type CreateAuctionArgs = {
  collectionId: string;
  tokenId: string;
  ownerAddress: string;
  minutes: number;
  days: number;
  startPrice: bigint;
  priceStep: bigint;
  tx: string;
};

@Injectable()
export class AuctionCreationService {
  private readonly logger = new Logger(AuctionCreationService.name);

  private readonly auctionRepository: Repository<AuctionEntity>;
  private blockchainBlockRepository: Repository<BlockchainBlock>;
  private readonly contractAskRepository: Repository<ContractAsk>;

  constructor(
    @Inject('DATABASE_CONNECTION') private connection: Connection,
    private broadcastService: BroadcastService,
    @Inject('UNIQUE_API') private uniqueApi: ApiPromise,
    private readonly extrinsicSubmitter: ExtrinsicSubmitter,
    @Inject('CONFIG') private config: MarketConfig,
    private searchIndexService: SearchIndexService,
    @Inject('AUCTION_CREDENTIALS') private auctionCredentials: AuctionCredentials,
    @InjectSentry() private readonly sentryService: SentryService
  ) {
    this.contractAskRepository = connection.getRepository(ContractAsk);
    this.blockchainBlockRepository = connection.getRepository(BlockchainBlock);
    this.auctionRepository = connection.manager.getRepository(AuctionEntity);
  }

  private async checkOwner(collectionId: number, tokenId: number): Promise<boolean> {
    const token = (await this.uniqueApi.query.nonfungible.tokenData(collectionId, tokenId)).toJSON()
    const owner = token['owner'];

    const uniqueSubstract = encodeAddress(this.auctionCredentials.uniqueAddress);

    if (owner?.substrate) {
      return encodeAddress(owner.substrate) === uniqueSubstract;
    }

    if (owner?.ethereum) {
      const ethereumSubstract = await this.connection.manager.createQueryBuilder(AccountPairs, 'account_pairs')
        .select(['account_pairs.ethereum'])
        .where('account_pairs.substrate = :address', { address: uniqueSubstract })
        .getOne() as { ethereum: string };

      this.logger.log(`Ethereum auction address: ${ethereumSubstract}, Owner ethereum address: ${owner.ethereum}`);
      return owner.ethereum === ethereumSubstract;
    }

    return false;
  }

  async create(createAuctionRequest: CreateAuctionArgs): Promise<OfferContractAskDto> {
    const { collectionId, tokenId, ownerAddress, days, minutes, startPrice, priceStep, tx } = createAuctionRequest;

    let stopAt = DateHelper.addDays(days);
    if (minutes) stopAt = DateHelper.addMinutes(minutes, stopAt);

    const block = await this.sendTransferExtrinsic(tx);
    await this.blockchainBlockRepository.save(block);

    this.logger.debug(`token transfer block number: ${block.block_number}`);

    const checkOwner = await this.checkOwner(+collectionId, +tokenId);

    if (!checkOwner) {
      this.sentryService.message('the token does not belong to the auction');
      throw new BadRequestException({
        statusCode: HttpStatus.CONFLICT,
        messsage: 'The token does not belog to the auction'
      })
    }

    const contractAsk = await this.contractAskRepository.create({
      id: uuid(),
      block_number_ask: block.block_number,
      network: this.config.blockchain.unique.network,
      collection_id: collectionId,
      token_id: tokenId,
      address_from: encodeAddress(ownerAddress),
      address_to: '',
      status: ASK_STATUS.ACTIVE, // todo - add appropriate status
      price: startPrice.toString(),
      currency: '',
      auction: {
        stopAt,
        status: AuctionStatus.active,
        startPrice: startPrice.toString(),
        priceStep: priceStep.toString(),
      },
    });


    await this.contractAskRepository.save(contractAsk);
      const offer = OfferContractAskDto.fromContractAsk(contractAsk);
      await this.searchIndexService.addSearchIndexIfNotExists({
        collectionId: Number(collectionId),
        tokenId: Number(tokenId),
      });

      this.broadcastService.sendAuctionStarted(offer);

    this.logger.debug(`{subject:'Create offer for auction',thread:'auction',
      collection: ${collectionId},
      token: ${tokenId},
      price: ${startPrice.toString()},
      block: ${block.block_number},
      auction: { stopAt:${stopAt}, startPrice: ${startPrice.toString()}, priceStep: ${priceStep.toString()}, status: 'ACTIVE' } ,
      address_from: ${ownerAddress}
      address_fromNorm: ${encodeAddress(ownerAddress)}
     }`)

      return offer;
  }

  private async sendTransferExtrinsic(tx: string): Promise<BlockchainBlock> {
    try {
      const { blockNumber } = await this.extrinsicSubmitter.submit(this.uniqueApi, tx);

      if (blockNumber === undefined || blockNumber === null || blockNumber.toString() === '0') {

        this.sentryService.message('sendTransferExtrinsic');

        throw new BadRequestException({
          statusCode: HttpStatus.CONFLICT,
          message: 'Block number is not defined'
        });
      }

      return this.blockchainBlockRepository.create({
        network: this.config.blockchain.unique.network,
        block_number: blockNumber.toString(),
        created_at: new Date(),
      });

    } catch (error) {
      this.logger.warn(error);
      this.sentryService.instance().captureException(new BadRequestException(error), {
        tags: { section: 'contract_ask' }
      });
      throw new BadRequestException({
        statusCode: HttpStatus.CONFLICT,
        message: 'Failed send transfer extrinsic',
        error: error.message
      });

    }
  }
}
