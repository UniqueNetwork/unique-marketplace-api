import { Inject, Injectable, Logger } from '@nestjs/common';
import { Connection, Repository } from 'typeorm';
import { ApiPromise } from '@polkadot/api';
import { BroadcastService } from '../../broadcast/services/broadcast.service';
import { AuctionEntity } from '../entities';
import { BlockchainBlock, ContractAsk } from '../../entity';
import { DatabaseHelper } from "./database-helper";
import { AuctionStatus, BidStatus } from "../types";
import { BidWithdrawService } from "./bid-withdraw.service";
import { AuctionCancellingService} from "./auction-cancelling.service";
import { ASK_STATUS } from "../../escrow/constants";
import { privateKey } from "../../utils/blockchain/util";
import { ExtrinsicSubmitter } from "./extrinsic-submitter";
import { MarketConfig } from "../../config/market-config";
import { KeyringPair } from "@polkadot/keyring/types";

@Injectable()
export class AuctionClosingService {
  private readonly logger = new Logger(AuctionClosingService.name);

  private auctionRepository: Repository<AuctionEntity>;
  private contractAskRepository: Repository<ContractAsk>;
  private blockchainBlockRepository: Repository<BlockchainBlock>;
  private auctionKeyring: KeyringPair;

  constructor(
    @Inject('DATABASE_CONNECTION') private connection: Connection,
    @Inject('KUSAMA_API') private kusamaApi: ApiPromise,
    @Inject('UNIQUE_API') private uniqueApi: ApiPromise,
    private broadcastService: BroadcastService,
    private bidWithdrawService: BidWithdrawService,
    private auctionCancellingService: AuctionCancellingService,
    private readonly extrinsicSubmitter: ExtrinsicSubmitter,
    @Inject('CONFIG') private config: MarketConfig,
  ) {
    this.auctionRepository = connection.manager.getRepository(AuctionEntity);
    this.contractAskRepository = connection.manager.getRepository(ContractAsk);
    this.blockchainBlockRepository = connection.getRepository(BlockchainBlock);

    this.auctionKeyring = privateKey(this.config.auction.seed);
  }

  async auctionsStoppingIntervalHandler(): Promise<void> {
    const databaseHelper = new DatabaseHelper(this.connection.manager);

    await databaseHelper.updateAuctionsAsClosing();
  }

  async auctionsWithdrawingIntervalHandler(): Promise<void> {
    const databaseHelper = await new DatabaseHelper(this.connection.manager);

    const auctions = await databaseHelper.findAuctionsReadyForWithdraw();

    const withdrawsPromises = auctions.map(async (auction) => {
      await this.processAuctionWithdraws(auction);
    });

    await Promise.all(withdrawsPromises);
  }

  private async processAuctionWithdraws(auction: AuctionEntity): Promise<void> {
    const databaseHelper = await new DatabaseHelper(this.connection.manager);
    await this.auctionRepository.update(auction.id, { status: AuctionStatus.withdrawing });

    const [winner, ...othersBidders] = await databaseHelper.getAuctionAggregatedBids({
      auctionId: auction.id,
      bidStatuses: [BidStatus.finished],
    });

    const contractAsk = await this.contractAskRepository.findOne(auction.contractAskId);
    const { collection_id, token_id, address_from } = contractAsk;

    if (winner) {
      const { bidderAddress: winnerAddress, totalAmount: finalPrice } = winner;

      const marketFee = finalPrice * 100n / BigInt(this.config.auction.commission);
      const ownerPrice = finalPrice - marketFee;

      let message = AuctionClosingService.getIdentityMessage(contractAsk, winnerAddress, finalPrice);
      message += `is winner;\n`;
      message += `going to send ${ownerPrice} to owner (${address_from});\n`;
      message += `market fee is ${marketFee};\n`;
      this.logger.log(message);

      await this.sendTokenToWinner(contractAsk, winnerAddress);

      const tx = await this.kusamaApi.tx.balances.transferKeepAlive(address_from, ownerPrice)
        .signAsync(this.auctionKeyring);

      await this.extrinsicSubmitter.submit(this.kusamaApi, tx)
        .then(() => this.logger.log(`transfer done`))
        .catch((error) => this.logger.warn(`transfer failed with ${error.toString()}`));
    } else {
      const contractAsk = await this.contractAskRepository.findOne(auction.contractAskId);
      await this.auctionCancellingService.sendTokenBackToOwner(contractAsk);
      await this.contractAskRepository.update(contractAsk.id, { status: ASK_STATUS.CANCELLED });
    }

    await Promise.all(othersBidders.map(({ bidderAddress, totalAmount }) => {
      const message = AuctionClosingService.getIdentityMessage(contractAsk, bidderAddress, totalAmount);

      if (totalAmount > 0) {
        this.logger.log(message +` is not a winner, going to withdraw`);

        return this.bidWithdrawService.withdrawByMarket(auction, bidderAddress, totalAmount)
      }

      this.logger.log(message + ' nothing to withdraw')
    }));
  }

  private async sendTokenToWinner(contractAsk: ContractAsk, winnerAddress: string): Promise<void> {
    try {
      const { collection_id, token_id } = contractAsk;

      const tx = await this.uniqueApi.tx.unique.transfer(
        winnerAddress,
        collection_id,
        token_id,
        1,
      ).signAsync(this.auctionKeyring);

      const signedBlock = await this.extrinsicSubmitter.submit(this.uniqueApi, tx);

      const block = this.blockchainBlockRepository.create({
        network: this.config.blockchain.unique.network,
        block_number: signedBlock?.block.header.number.toString() || 'no_number',
        created_at: new Date(),
      });

      await this.blockchainBlockRepository.save(block);
      await this.contractAskRepository.update(contractAsk.id, { block_number_buy: block.block_number });
    } catch (error) {
      this.logger.error(error);
    }
  }

  static getIdentityMessage(contract: ContractAsk, address: string, amount: bigint): string {
    return `${contract.collection_id}/${contract.token_id}; ${address}  (current amount: ${amount})`;
  }
}
