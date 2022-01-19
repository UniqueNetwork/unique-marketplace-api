import { Injectable, Inject } from '@nestjs/common';
import { Connection } from 'typeorm';

@Injectable()
export class AuctionService {
  constructor(
    @Inject('DATABASE_CONNECTION') private db: Connection,
    @Inject('CONFIG') private config
  ) {}
  /**
   *
   * @param tokenId
   * @param collectionId
   * @param price
   * @param step
   * @returns
   */
  async setAuction(
    tokenId: number,
    collectionId: number,
    price: string | undefined,
    step: string,
  ): Promise<number | 0> {

    return 0;
  }
  /**
   *
   * @param auctionId
   * @returns
   */
  async getAuction(
    auctionId: number,
  ): Promise<any> {
    return {};
  }
}
