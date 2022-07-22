import { Inject, Injectable } from '@nestjs/common';
import { Connection } from 'typeorm';
import { DatabaseHelper } from '../helpers/database-helper';
import { AuctionStatus } from '../../../types';
import { OffersEntity } from '../../../entity';

@Injectable()
export class ForceClosingService {
  constructor(@Inject('DATABASE_CONNECTION') private connection: Connection) {}

  async forceCloseAuction(collectionId: string, tokenId: string): Promise<void> {
    const databaseHelper = new DatabaseHelper(this.connection.manager);

    const contract = await databaseHelper.getAuction({
      collectionId: Number(collectionId),
      tokenId: Number(tokenId),
    });

    await this.connection.manager.update(OffersEntity, contract.id, {
      stopAt: new Date(),
      status_auction: AuctionStatus.stopped,
    });
  }
}
