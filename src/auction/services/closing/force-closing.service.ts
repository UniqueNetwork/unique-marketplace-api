import { Inject, Injectable } from '@nestjs/common';
import { Connection } from 'typeorm';
import { DatabaseHelper } from '../helpers/database-helper';
import { AuctionStatus } from '../../types';
import { AuctionEntity } from '../../entities';

@Injectable()
export class ForceClosingService {
  constructor(@Inject('DATABASE_CONNECTION') private connection: Connection) {}

  async forceCloseAuction(collectionId: string, tokenId: string): Promise<void> {
    const databaseHelper = new DatabaseHelper(this.connection.manager);

    const contract = await databaseHelper.getAuctionContract(
      {
        collectionId: Number(collectionId),
        tokenId: Number(tokenId),
      },
      [AuctionStatus.created, AuctionStatus.active],
    );

    await this.connection.manager.update(AuctionEntity, contract.auction.id, {
      stopAt: new Date(),
      status: AuctionStatus.stopped,
    });
  }
}
