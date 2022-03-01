import { Command, Positional, Option } from 'nestjs-command';
import { ModuleRef } from '@nestjs/core';
import { Injectable } from '@nestjs/common';

import { KusamaEscrow } from './kusama';
import { UniqueEscrow } from './unique';
import { EscrowService } from './service';
import { Escrow } from './base';
import { AuctionClosingScheduler } from '../auction/services/closing/auction-closing.scheduler';

const AuctionManagerOption = Option({
  name: 'auction',
  description: 'additionally start auction closing scheduler',
  type: 'boolean',
  default: false,
  demandOption: false,
});

@Injectable()
export class EscrowCommand {
  constructor(private moduleRef: ModuleRef) {}

  @Command({
    command: 'start_escrow <network>',
    describe: 'Starts escrow service for selected network',
  })
  async start_escrow(@Positional({ name: 'network' }) network: string, @AuctionManagerOption isAuctionManager: boolean) {
    const networks: Record<string, typeof Escrow> = {
      unique: UniqueEscrow,
      kusama: KusamaEscrow,
    };

    if (!networks.hasOwnProperty(network)) {
      console.error(`No escrow service for ${network} network`);
      return;
    }

    if (isAuctionManager) this.startAuctionManager();

    const config = this.moduleRef.get('CONFIG', { strict: false });
    const service = this.moduleRef.get(EscrowService, { strict: false });
    const escrow = new networks[network](config, service);

    await escrow.init();

    await escrow.work();
  }

  private startAuctionManager(): void {
    setImmediate(() => {
      const auctionClosingScheduler = this.moduleRef.get(AuctionClosingScheduler, { strict: false });

      auctionClosingScheduler.startIntervals();
    });
  }
}
