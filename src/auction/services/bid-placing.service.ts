import { BadRequestException, Inject, Injectable, Logger } from "@nestjs/common";
import { Connection, Repository, LessThan } from "typeorm";

import { AuctionEntity, BidEntity } from "../entities";
import { BroadcastService } from "../../broadcast/services/broadcast.service";
import { OfferContractAskDto } from "../../offers/dto/offer-dto";
import { BlockchainBlock, ContractAsk } from "../../entity";
import { BidStatus } from "../types";
import { WithdrawBidRequest } from "../requests/withdraw-bid";

type PlaceBidArgs = {
  collectionId: number;
  tokenId: number;
  amount: string;
  bidderAddress: string;
  tx: string;
}

@Injectable()
export class BidPlacingService {
  private readonly logger = new Logger(BidPlacingService.name);

  private bidRepository: Repository<BidEntity>;
  private readonly auctionRepository: Repository<AuctionEntity>;
  private blockchainBlockRepository: Repository<BlockchainBlock>;
  private readonly contractAskRepository: Repository<ContractAsk>;

  constructor(
    @Inject('DATABASE_CONNECTION') connection: Connection,
    private broadcastService: BroadcastService,
  ) {
    this.bidRepository = connection.manager.getRepository(BidEntity);
    this.contractAskRepository = connection.getRepository(ContractAsk);
    this.blockchainBlockRepository = connection.getRepository(BlockchainBlock);
    this.auctionRepository = connection.manager.getRepository(AuctionEntity);
  }

  async placeBid(placeBidArgs: PlaceBidArgs): Promise<OfferContractAskDto> {
    const { collectionId, tokenId, amount, bidderAddress, tx } = placeBidArgs;

    await this.sendTransferExtrinsic(tx);

    const {
      id: contractAskId,
      auction: { id: auctionId },
    } = await this.getContractAsk(collectionId, tokenId);

    const existingBid = await this.bidRepository.findOne({ auctionId, bidderAddress, isWithdrawn: false });

    let bid: BidEntity;

    if (existingBid) {
      bid = existingBid;
      bid.amount = (Number(existingBid.amount) + Number(amount)).toString();
    } else {
      bid = this.bidRepository.create({
        amount,
        auctionId,
        bidderAddress,
        isWithdrawn: false,
        status: BidStatus.created,
      });
    }

    await this.bidRepository.save(bid);

    await this.contractAskRepository.update({ id: contractAskId }, { price: bid.amount });


    const offer = await this.getOffer(collectionId, tokenId);

    await this.broadcastService.sendBidPlaced(offer);

    return offer;
  }

  async withdrawBid(withdrawBidRequest: WithdrawBidRequest): Promise<void> {
    const { collectionId, tokenId, bidderAddress } = withdrawBidRequest;

    const {
      auction: { id: auctionId },
      price,
    } = await this.getContractAsk(collectionId, tokenId);

    const result = await this.bidRepository.update({
      auctionId,
      bidderAddress,
      isWithdrawn: false,
      amount: LessThan(price),
    },
      { isWithdrawn: true }
    )

    this.logger.debug(JSON.stringify(result));
  }

  private async getContractAsk(collectionId: number, tokenId: number): Promise<ContractAsk> {
    const offerWithAuction = await this.contractAskRepository.findOne({
      where: {
        collection_id: collectionId,
        token_id: tokenId,
        status: 'active',
      },
      relations: ['auction'],
    });

    if (offerWithAuction?.auction) {
      return offerWithAuction;
    }

    throw new BadRequestException(`No active auction found for ${JSON.stringify({collectionId, tokenId})}`);
  }

  private async getOffer(collectionId: number, tokenId: number): Promise<OfferContractAskDto> {
    const contractAsk = await this.contractAskRepository
      .createQueryBuilder('contractAsk')
      .where('contractAsk.collection_id = :collectionId', { collectionId })
      .andWhere('contractAsk.token_id = :tokenId', { tokenId })
      .leftJoinAndMapOne(
        'contractAsk.auction',
        AuctionEntity,
        'auction',
        'auction.contract_ask_id = contractAsk.id'
      )
      .leftJoinAndMapMany(
        'auction.bids',
        BidEntity,
        'bid',
        'bid.auction_id = auction.id and bid.is_withdrawn = false',
      )
      .getOne();

    return OfferContractAskDto.fromContractAsk(contractAsk);
  }

  // todo - implement
  private async sendTransferExtrinsic(tx: string): Promise<void> {
    this.logger.debug(tx);
  }
}
