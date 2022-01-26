import { Inject, Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { AuctionEntity } from '../../entities';
import { Connection, Repository } from 'typeorm';
import * as util from '../../../utils/blockchain/util';
//TODO: Сделать отдельный сервис, который бы возращал всем соединение
import * as unique from '../../../utils/blockchain/unique';

@Injectable()
export class AuctionClosedService {
  private readonly logger = new Logger(AuctionClosedService.name);

  private readonly auctionRepository: Repository<AuctionEntity>;

  constructor(
    @Inject('DATABASE_CONNECTION') connection: Connection,
  ) {
    this.auctionRepository = connection.manager.getRepository(AuctionEntity)
  }

  @Interval(8000)
  handleInterval() {
    this.logger.log('checking closed auction');
  }
}
