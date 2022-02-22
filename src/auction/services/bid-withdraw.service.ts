import { BadRequestException, Inject, Logger } from '@nestjs/common';
import { Connection, Repository } from 'typeorm';
import { AuctionEntity, BidEntity } from '../entities';
import { ContractAsk } from '../../entity';
import { BroadcastService } from '../../broadcast/services/broadcast.service';
import { ApiPromise } from '@polkadot/api';
import { MarketConfig } from '../../config/market-config';
import { ExtrinsicSubmitter } from './extrinsic-submitter';
import { OfferContractAskDto } from '../../offers/dto/offer-dto';
import { ASK_STATUS } from '../../escrow/constants';
import { BidStatus } from '../types';
import { BN } from '@polkadot/util';
import { privateKey } from "../../utils/blockchain/util";

type BidWithdrawArgs = {
  collectionId: number;
  tokenId: number;
  bidderAddress: string;
  amount: string;
};

export class BidWithdrawService {
  private readonly logger = new Logger(BidWithdrawService.name);

  private readonly bidRepository: Repository<BidEntity>;
  private readonly auctionRepository: Repository<AuctionEntity>;
  private readonly contractAskRepository: Repository<ContractAsk>;

  constructor(
    @Inject('DATABASE_CONNECTION') private connection: Connection,
    private broadcastService: BroadcastService,
    @Inject('KUSAMA_API') private kusamaApi: ApiPromise,
    @Inject('CONFIG') private config: MarketConfig,
    private readonly extrinsicSubmitter: ExtrinsicSubmitter,
  ) {
    this.bidRepository = connection.manager.getRepository(BidEntity);
    this.auctionRepository = connection.manager.getRepository(AuctionEntity);
    this.contractAskRepository = connection.getRepository(ContractAsk);
  }

  async tryWithdrawBid(args: BidWithdrawArgs): Promise<OfferContractAskDto> {
    let withdrawableUserBid: BidEntity;

    try {
      withdrawableUserBid = await this.getWithdrawableBid(args);

      return '' as any;
    } catch (error) {

      throw new BadRequestException(error.message);
    } finally {
      if (withdrawableUserBid) {

      }
    }
  }

  private async transferBalance(args: BidWithdrawArgs, oldBid: BidEntity): Promise<void> {
    const auctionKeyring = privateKey(this.config.auction.seed);

    const tx = await this.kusamaApi.tx.balances.transfer(args.bidderAddress, args.amount).signAsync(auctionKeyring);

    await this.extrinsicSubmitter.submit(this.kusamaApi, tx)
      .then(() => {

      })
      .catch((error) => {
        this.logger.error('handleBidTxFail');
        this.logger.error(JSON.stringify(args));
        this.logger.error(JSON.stringify(oldBid));
        this.logger.error(error.message);
      });
  }

  // private handleTransferSuccess(): Promise<void> {
  //
  // }
  //
  // private handleTransferFail(): Promise<void> {
  //
  // }

  private async getWithdrawableBid(args: BidWithdrawArgs): Promise<BidEntity> {
    const { collectionId, tokenId, bidderAddress, amount } = args;

    return this.connection.transaction<BidEntity>(async (transactionEntityManager) => {
      const contractAsk = await transactionEntityManager.findOne(ContractAsk, {
        where: { collection_id: collectionId, token_id: tokenId, status: ASK_STATUS.ACTIVE },
        relations: ['auction'],
      });

      if (!contractAsk) throw new Error(`No offer for ${collectionId}/${tokenId}`);
      if (!contractAsk.auction) throw new Error(`No auction for ${collectionId}/${tokenId}`);

      const bids = await transactionEntityManager.find(BidEntity, { where: { auctionId: contractAsk.auction.id }, order: { pendingAmount: 'DESC'}, take: 1 });
      const maxPendingBid = bids[0];

      if (maxPendingBid?.bidderAddress === bidderAddress) {
        throw new Error(`Your bid will be winning after minting, unable to withdraw it now`);
      }

      const userBid = bids.find((bid) => bid.bidderAddress === bidderAddress);

      if (!userBid) throw new Error(`No bids with address ${bidderAddress} found`);

      // if (userBid.status === BidStatus.winning) {
      //   throw new Error(`Your bid is winning now, try withdraw later`);
      // }

      if (userBid.pendingAmount !== userBid.amount) {
        throw new Error(`Your bid is minting now, try withdraw later`);
      }

      const userBidAmountBn = new BN(userBid.amount);
      const withdrawalAmountBn = new BN(amount);
      const newPendingAmountBn = userBidAmountBn.sub(withdrawalAmountBn);

      if (newPendingAmountBn.isNeg()) {
        throw new Error(`Your bid amount is less than you want to withdraw. Your amount is ${userBid.amount}`);
      }

      userBid.pendingAmount = newPendingAmountBn.toString();
      userBid.status = BidStatus.minting;

      await transactionEntityManager.save(BidEntity, userBid);

      return userBid;
    });
  }
}
