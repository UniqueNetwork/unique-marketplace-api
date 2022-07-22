import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SaveOptions } from 'typeorm';

import { MoneyTransfer } from '../../entity';

@Injectable()
export class MoneyTransferService {
  constructor(
    @InjectRepository(MoneyTransfer)
    private moneyTransferRepository?: Repository<MoneyTransfer>,
  ) {}

  async saveMoneyTransfer(transfer: MoneyTransfer, options?: SaveOptions) {
    await this.moneyTransferRepository.save(transfer, options);
  }
}
