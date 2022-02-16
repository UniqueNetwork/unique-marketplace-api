import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import { Connection, LessThan, Repository } from 'typeorm';

import { v4 as uuid } from 'uuid';

import { AuctionEntity, BidEntity } from '../entities';
import { BroadcastService } from '../../broadcast/services/broadcast.service';
import { OfferContractAskDto } from '../../offers/dto/offer-dto';
import { BlockchainBlock, ContractAsk } from '../../entity';
import { WithdrawBidRequest } from '../requests/withdraw-bid';
import { ApiPromise } from '@polkadot/api';
import { MarketConfig } from '../../config/market-config';
import { ExtrinsicSubmitter } from './extrinsic-submitter';
import { ASK_STATUS } from '../../escrow/constants';
import { BN } from '@polkadot/util';
import { BidStatus } from '../types';

type PlaceBidArgs = {
  collectionId: number;
  tokenId: number;
  amount: string;
  bidderAddress: string;
  tx: string;
};

@Injectable()
export class BidPlacingService {
  private readonly logger = new Logger(BidPlacingService.name);

  private bidRepository: Repository<BidEntity>;
  private readonly auctionRepository: Repository<AuctionEntity>;
  private blockchainBlockRepository: Repository<BlockchainBlock>;
  private readonly contractAskRepository: Repository<ContractAsk>;

  constructor(
    @Inject('DATABASE_CONNECTION') private connection: Connection,
    private broadcastService: BroadcastService,
    @Inject('KUSAMA_API') private kusamaApi: ApiPromise,
    @Inject('CONFIG') private config: MarketConfig,
    private readonly extrinsicSubmitter: ExtrinsicSubmitter,
  ) {
    this.bidRepository = connection.manager.getRepository(BidEntity);
    this.contractAskRepository = connection.getRepository(ContractAsk);
    this.blockchainBlockRepository = connection.getRepository(BlockchainBlock);
    this.auctionRepository = connection.manager.getRepository(AuctionEntity);
  }

  async placeBid(placeBidArgs: PlaceBidArgs): Promise<OfferContractAskDto> {
    const { tx } = placeBidArgs;

    let contractAsk: ContractAsk;

    try {
      contractAsk = await this.tryPlacePendingBid(placeBidArgs);

      const offer = OfferContractAskDto.fromContractAsk(contractAsk);

      await this.broadcastService.sendBidPlaced(offer);

      return offer;
    } catch (error) {
      this.logger.warn(error);

      throw new BadRequestException(error.message);
    } finally {
      if (contractAsk) {
        await this.extrinsicSubmitter
          .submit(this.kusamaApi, tx)
          .then(() => this.handleBidTxSuccess(placeBidArgs, contractAsk))
          .catch(() => this.handleBidTxFail(placeBidArgs, contractAsk));
      }
    }
  }

  private async handleBidTxSuccess(placeBidArgs: PlaceBidArgs, oldContractAsk: ContractAsk): Promise<void> {
    const { amount } = placeBidArgs;
    const userBidId = oldContractAsk.auction.bids[0].id;

    try {
      await this.connection.transaction(async (transactionEntityManager) => {
        const currentUserBid = await transactionEntityManager.findOne(BidEntity, userBidId);
        currentUserBid.amount = new BN(currentUserBid.amount).add(new BN(amount)).toString();

        const currentContractAsk = await transactionEntityManager.findOne(ContractAsk, oldContractAsk.id);

        if (currentUserBid.amount === currentUserBid.pendingAmount) {
          // no mints for current bidder - update bids statuses

          if (currentContractAsk.price === currentUserBid.amount) {
            await transactionEntityManager.update(
              BidEntity,
              {
                auctionId: oldContractAsk.auction.id,
                status: BidStatus.winning,
              },
              { status: BidStatus.outbid },
            );

            currentUserBid.status = BidStatus.winning;
          } else {
            currentUserBid.status = BidStatus.outbid;
          }
        }

        await transactionEntityManager.save(BidEntity, currentUserBid);
      });
    } catch (error) {
      this.logger.error('handleBidTxSuccess');
      this.logger.error(JSON.stringify(placeBidArgs));
      this.logger.error(JSON.stringify(oldContractAsk));
      this.logger.error(error.message);
    }
  }

  private async handleBidTxFail(placeBidArgs: PlaceBidArgs, oldContractAsk: ContractAsk): Promise<void> {
    const { amount } = placeBidArgs;
    const oldUserBid = oldContractAsk.auction.bids[0];
    const userBidId = oldUserBid.id;

    try {
      await this.connection.transaction<void>(async (transactionEntityManager) => {
        const currentUserBid = await transactionEntityManager.findOne(BidEntity, userBidId);
        const currentContractAsk = await transactionEntityManager.findOne(ContractAsk, oldContractAsk.id);

        const isRefreshContractPrice = currentContractAsk.price === currentUserBid.pendingAmount;

        currentUserBid.pendingAmount = new BN(currentUserBid.pendingAmount).sub(new BN(amount)).toString();

        if (currentUserBid.pendingAmount === '0' && currentUserBid.amount === '0') {
          await transactionEntityManager.delete(BidEntity, userBidId);
        } else {
          if (currentUserBid.pendingAmount === currentUserBid.amount) {
            currentUserBid.status = BidStatus.created;
          }

          await transactionEntityManager.save(BidEntity, currentUserBid);
        }

        if (isRefreshContractPrice) {
          const bids = await transactionEntityManager.find(BidEntity, { where: { auctionId: oldContractAsk.auction.id } });
          BidPlacingService.sortBids(bids);

          const maxPendingBid = bids[0];
          currentContractAsk.price = maxPendingBid ? maxPendingBid.pendingAmount : oldContractAsk.auction.startPrice;

          await transactionEntityManager.save(currentContractAsk);
        }
      });
    } catch (error) {
      this.logger.error('handleBidTxFail');
      this.logger.error(JSON.stringify(placeBidArgs));
      this.logger.error(JSON.stringify(oldContractAsk));
      this.logger.error(error.message);
    }
  }

  private async tryPlacePendingBid(placeBidArgs: PlaceBidArgs): Promise<ContractAsk> {
    const { collectionId, tokenId, amount, bidderAddress, tx } = placeBidArgs;

    return this.connection.transaction<ContractAsk>(async (transactionEntityManager) => {
      const contractAsk = await transactionEntityManager.findOne(ContractAsk, {
        where: { collection_id: collectionId, token_id: tokenId, status: ASK_STATUS.ACTIVE },
        relations: ['auction'],
      });

      if (!contractAsk) throw new BadRequestException('no offer');
      if (!contractAsk.auction) throw new BadRequestException('no auction');

      const priceStepBn = new BN(contractAsk.auction.priceStep);
      const amountBn = new BN(amount);
      if (amountBn.lt(priceStepBn)) throw new BadRequestException(`Price step is ${contractAsk.auction.priceStep}`);

      let bids = await transactionEntityManager.find(BidEntity, {
        where: { auctionId: contractAsk.auction.id },
      });

      bids = BidPlacingService.sortBids(bids);

      const [currentMaxBid, ...restBids] = bids;

      let userBid: BidEntity | undefined = bids.find((bid) => bid.bidderAddress === bidderAddress);

      const userTotalAmountBn = userBid ? amountBn.add(new BN(userBid.pendingAmount)) : amountBn;

      const minTotalPriceBn = currentMaxBid ? new BN(currentMaxBid.pendingAmount).add(priceStepBn) : new BN(contractAsk.auction.startPrice);
      if (userTotalAmountBn.lt(minTotalPriceBn)) {
        const minAmountBn = BN.max(minTotalPriceBn.sub(userTotalAmountBn), priceStepBn);

        throw new Error(`Current price is ${minTotalPriceBn.toString()}; minimum amount for you is ${minAmountBn}`);
      }

      if (userBid) {
        userBid.pendingAmount = userTotalAmountBn.toString();
        userBid.status = BidStatus.minting;
      } else {
        userBid = this.bidRepository.create({
          id: uuid(),
          amount: '0',
          pendingAmount: userTotalAmountBn.toString(),
          auctionId: contractAsk.auction.id,
          bidderAddress,
          isWithdrawn: false,
          status: BidStatus.minting,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      await transactionEntityManager.save(BidEntity, userBid);

      contractAsk.price = userTotalAmountBn.toString();
      await transactionEntityManager.save(ContractAsk, contractAsk);

      contractAsk.auction.bids = [];
      contractAsk.auction.bids.push(userBid);

      if (currentMaxBid && currentMaxBid.bidderAddress !== userBid.bidderAddress) {
        contractAsk.auction.bids.push(currentMaxBid);
      }

      contractAsk.auction.bids.push(...restBids.filter((bid) => bid.bidderAddress !== userBid.bidderAddress));

      return contractAsk;
    });
  }

  private static sortBids(bids: BidEntity[]): BidEntity[] {
    return [...bids].sort((a, b) => {
      const aAmount = new BN(a.pendingAmount);
      const bAmount = new BN(b.pendingAmount);

      if (aAmount.eq(bAmount)) return 0;
      return aAmount.gt(bAmount) ? 1 : -1;
    });
  }

  async withdrawBid(withdrawBidRequest: WithdrawBidRequest): Promise<void> {
    const { collectionId, tokenId, bidderAddress } = withdrawBidRequest;

    const {
      auction: { id: auctionId },
      price,
    } = await this.getContractAsk(collectionId, tokenId);

    const result = await this.bidRepository.update(
      {
        auctionId,
        bidderAddress,
        isWithdrawn: false,
        amount: LessThan(price),
      },
      { isWithdrawn: true },
    );

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

    throw new BadRequestException(`No active auction found for ${JSON.stringify({ collectionId, tokenId })}`);
  }

  private async getOffer(collectionId: number, tokenId: number): Promise<OfferContractAskDto> {
    const contractAsk = await this.contractAskRepository
      .createQueryBuilder('contractAsk')
      .where('contractAsk.collection_id = :collectionId', { collectionId })
      .andWhere('contractAsk.token_id = :tokenId', { tokenId })
      .leftJoinAndMapOne('contractAsk.auction', AuctionEntity, 'auction', 'auction.contract_ask_id = contractAsk.id')
      .leftJoinAndMapMany('auction.bids', BidEntity, 'bid', 'bid.auction_id = auction.id and bid.is_withdrawn = false')
      .getOne();

    return OfferContractAskDto.fromContractAsk(contractAsk);
  }
}
