import { Inject, Injectable, Logger} from "@nestjs/common";
import { AuctionStatus} from "../types";
import { Connection, Repository} from "typeorm";
import { AuctionEntity} from "../entities";
import { BroadcastService} from "../../broadcast/services/broadcast.service";
import { BlockchainBlock, ContractAsk} from "../../entity";
import { v4 as uuid } from 'uuid';
import { ASK_STATUS } from "../../escrow/constants";
import { OfferContractAskDto } from "../../offers/dto/offer-dto";

type CreateAuctionArgs = {
  collectionId: string;
  tokenId: string;
  ownerAddress: string,
  stopAt: Date;
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
      stopAt,
      startPrice,
      priceStep,
      tx,
    } = createAuctionRequest;

    const block = await this.sendTransferExtrinsic(tx);
    await this.blockchainBlockRepository.save(block);

    const contractAsk = await this.contractAskRepository.create({
      id: uuid(),
      block_number_ask: block.block_number,
      network: `dummy_network`,
      collection_id: collectionId,
      token_id: tokenId,
      address_from: ownerAddress,
      address_to: '',
      status: ASK_STATUS.ACTIVE, // todo - add appropriate status
      price: startPrice,
      currency: '',
      auction: {
        stopAt,
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
  private sendTransferExtrinsic(tx: string): BlockchainBlock {
    this.logger.debug(tx);

    return this.blockchainBlockRepository.create({
      network: 'dummy_network',
      block_number: Date.now().toString(),
      created_at: new Date(),
    });
  }
}