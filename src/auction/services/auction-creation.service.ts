import {BadRequestException, Inject, Injectable, Logger} from "@nestjs/common";
import { AuctionStatus} from "../types";
import { Connection, Repository} from "typeorm";
import { AuctionEntity} from "../entities";
import { BroadcastService} from "../../broadcast/services/broadcast.service";
import { BlockchainBlock, ContractAsk} from "../../entity";
import { v4 as uuid } from 'uuid';
import { ASK_STATUS } from "../../escrow/constants";
import { OfferContractAskDto } from "../../offers/dto/offer-dto";
import { ApiPromise } from "@polkadot/api";
import { DateHelper } from "../../utils/date-helper";
import { ExtrinsicSubmitter } from "./extrinsic-submitter";
import { MarketConfig } from "../../config/market-config";

type CreateAuctionArgs = {
  collectionId: string;
  tokenId: string;
  ownerAddress: string,
  days: number;
  startPrice: string
  priceStep: string;
  tx: string;
}

@Injectable()
export class AuctionCreationService {
  private readonly logger = new Logger(AuctionCreationService.name);

  private readonly auctionRepository: Repository<AuctionEntity>;
  private blockchainBlockRepository: Repository<BlockchainBlock>;
  private readonly contractAskRepository: Repository<ContractAsk>;

  constructor(
    @Inject('DATABASE_CONNECTION') connection: Connection,
    private broadcastService: BroadcastService,
    @Inject('UniqueApi') private uniqueApi: ApiPromise,
    private readonly extrinsicSubmitter: ExtrinsicSubmitter,
    @Inject('CONFIG') private config: MarketConfig,
  ) {
    this.contractAskRepository = connection.getRepository(ContractAsk);
    this.blockchainBlockRepository = connection.getRepository(BlockchainBlock);
    this.auctionRepository = connection.manager.getRepository(AuctionEntity);
  }

  async create(createAuctionRequest: CreateAuctionArgs): Promise<OfferContractAskDto> {
    const {
      collectionId,
      tokenId,
      ownerAddress,
      days,
      startPrice,
      priceStep,
      tx,
    } = createAuctionRequest;

    const block = await this.sendTransferExtrinsic(tx);
    await this.blockchainBlockRepository.save(block);

    this.logger.debug(`token transfer block number: ${block.block_number}`);

    const contractAsk = await this.contractAskRepository.create({
      id: uuid(),
      block_number_ask: block.block_number,
      network: this.config.blockchain.unique.network,
      collection_id: collectionId,
      token_id: tokenId,
      address_from: ownerAddress,
      address_to: '',
      status: ASK_STATUS.ACTIVE, // todo - add appropriate status
      price: startPrice,
      currency: '',
      auction: {
        stopAt: DateHelper.addDays(days),
        status: AuctionStatus.created,
        startPrice,
        priceStep,
      },
    });

    await this.contractAskRepository.save(contractAsk);

    const offer = OfferContractAskDto.fromContractAsk(contractAsk);

    this.broadcastService.sendAuctionStarted(offer);

    return offer;
  }

  // todo - implement
  private async sendTransferExtrinsic(tx: string): Promise<BlockchainBlock> {
    try {
      const signedBlock = await this.extrinsicSubmitter.submit(this.uniqueApi, tx);

      return this.blockchainBlockRepository.create({
        network: this.config.blockchain.unique.network,
        block_number: signedBlock?.block.header.number.toString() || 'no_number',
        created_at: new Date(),
      });
    } catch (error) {
      throw new BadRequestException(error);
    }
  }
}