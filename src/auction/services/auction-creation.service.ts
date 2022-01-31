import { Inject, Injectable, Logger} from "@nestjs/common";
import { AuctionStatus} from "../types";
import { Connection, Repository} from "typeorm";
import { AuctionEntity} from "../entities";
import { BroadcastService} from "../../broadcast/services/broadcast.service";
import { BlockchainBlock, ContractAsk} from "../../entity";
import { CreateAuctionRequest } from "../requests";
import { v4 as uuid } from 'uuid';
import { ASK_STATUS } from "../../escrow/constants";
import { OfferContractAskDto } from "../../offers/dto/offer-dto";

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

  async create(createAuctionRequest: CreateAuctionRequest): Promise<OfferContractAskDto> {
    const {
      collection_id,
      token_id,
      stopAt,
      startPrice,
      priceStep,
      currency,
      tokenTransferTransactionHex,
    } = createAuctionRequest;

    const block = await this.applyTransaction(tokenTransferTransactionHex);
    await this.blockchainBlockRepository.save(block);

    const contractAsk = await this.contractAskRepository.create({
      id: uuid(),
      block_number_ask: block.block_number,
      network: `dummy_network`,
      collection_id,
      token_id,
      address_from: `dummy_address`,
      address_to: `coming_soon`,
      status: ASK_STATUS.ACTIVE, // todo - add appropriate status
      price: startPrice,
      currency,
      auction: {
        stopAt,
        status: AuctionStatus.created,
        startPrice,
        priceStep,
      },
    });

    await this.contractAskRepository.save(contractAsk);
    contractAsk.blockchain = block;

    const offer = OfferContractAskDto.fromContractAsk(contractAsk);

    this.broadcastService.sendAuctionStarted(offer);

    return offer;
  }

  // todo - implement
  private applyTransaction(nftTransferTransaction: string): BlockchainBlock {
    return this.blockchainBlockRepository.create({
      network: 'dummy_network',
      block_number: Date.now().toString(),
      created_at: new Date(),
    });
  }
}