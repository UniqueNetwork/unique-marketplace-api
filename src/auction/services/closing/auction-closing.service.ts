import { Inject, Injectable, Logger } from '@nestjs/common';
import { Connection, Repository } from 'typeorm';
import { ApiPromise } from '@polkadot/api';
import { BroadcastService } from '../../../broadcast/services/broadcast.service';
import { AuctionEntity } from '../../entities';
import { BlockchainBlock, ContractAsk } from '../../../entity';
import { DatabaseHelper } from '../helpers/database-helper';
import { AuctionStatus, BidStatus } from '../../types';
import { BidWithdrawService } from '../bid-withdraw.service';
import { AuctionCancelingService } from '../auction-canceling.service';
import { ASK_STATUS } from '../../../escrow/constants';
import { ExtrinsicSubmitter } from '../helpers/extrinsic-submitter';
import { MarketConfig } from '../../../config/market-config';
import { KeyringPair } from '@polkadot/keyring/types';
import { OfferContractAskDto } from '../../../offers/dto/offer-dto';
import { AuctionCredentials } from "../../providers";

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
    private auctionCancellingService: AuctionCancelingService,
    private readonly extrinsicSubmitter: ExtrinsicSubmitter,
    @Inject('CONFIG') private config: MarketConfig,
    @Inject('AUCTION_CREDENTIALS') private auctionCredentials: AuctionCredentials,
  ) {
    this.auctionRepository = connection.manager.getRepository(AuctionEntity);
    this.contractAskRepository = connection.manager.getRepository(ContractAsk);
    this.blockchainBlockRepository = connection.getRepository(BlockchainBlock);
    this.auctionKeyring = auctionCredentials.keyring;
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

  async processAuctionWithdraws(auction: AuctionEntity): Promise<void> {
    const databaseHelper = await new DatabaseHelper(this.connection.manager);
    await this.auctionRepository.update(auction.id, { status: AuctionStatus.withdrawing });

    const [winner, ...othersBidders] = await databaseHelper.getAuctionAggregatedBids({
      auctionId: auction.id,
      bidStatuses: [BidStatus.finished],
    });

    const contractAsk = await this.contractAskRepository.findOne(auction.contractAskId);
    const { address_from } = contractAsk;

    // force withdraw bids for all except winner
    await Promise.all(
      othersBidders.map(({ bidderAddress, totalAmount }) => {
        const message = AuctionClosingService.getIdentityMessage(contractAsk, bidderAddress, totalAmount);

        if (totalAmount > 0) {
          this.logger.log(message + ` is not a winner, going to withdraw`);

          return this.bidWithdrawService.withdrawByMarket(auction, bidderAddress, totalAmount);
        }

        this.logger.log(message + ' nothing to withdraw');
      }),
    );

    if (winner) {
      const { bidderAddress: winnerAddress, totalAmount: finalPrice } = winner;

      const marketFee = finalPrice * BigInt(this.config.auction.commission) / 100n;
      const ownerPrice = finalPrice - marketFee;

      let message = AuctionClosingService.getIdentityMessage(contractAsk, winnerAddress, finalPrice);
      message += ` is winner;\n`;
      message += `going to send ${ownerPrice} to owner (${address_from});\n`;
      message += `market fee is ${marketFee};\n`;
      this.logger.log(message);

      await this.sendTokenToWinner(contractAsk, winnerAddress);

      const tx = await this.kusamaApi.tx.balances.transferKeepAlive(address_from, ownerPrice).signAsync(this.auctionKeyring);

      await this.extrinsicSubmitter
        .submit(this.kusamaApi, tx)
        .then(() => this.logger.log(`transfer done`))
        .catch((error) => this.logger.warn(`transfer failed with ${error.toString()}`));

      await this.contractAskRepository.update(contractAsk.id, { status: ASK_STATUS.BOUGHT });
      await this.auctionRepository.update(auction.id, { status: AuctionStatus.ended });
    } else {
      const contractAsk = await this.contractAskRepository.findOne(auction.contractAskId);
      await this.auctionCancellingService.sendTokenBackToOwner(contractAsk);
      await this.contractAskRepository.update(contractAsk.id, { status: ASK_STATUS.CANCELLED });
    }

    contractAsk.auction = auction;
    await this.broadcastService.sendAuctionClose(OfferContractAskDto.fromContractAsk(contractAsk));
  }

  private async sendTokenToWinner(contractAsk: ContractAsk, winnerAddress: string): Promise<void> {
    try {
      const { collection_id, token_id } = contractAsk;

      const tx = await this.uniqueApi.tx.unique.transfer(
        { Substrate: winnerAddress },
        collection_id,
        token_id,
        1,
      ).signAsync(this.auctionKeyring);

      const { blockNumber } = await this.extrinsicSubmitter.submit(this.uniqueApi, tx);

      const block = this.blockchainBlockRepository.create({
        network: this.config.blockchain.unique.network,
        block_number: blockNumber.toString(),
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
