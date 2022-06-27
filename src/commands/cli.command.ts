import { Injectable } from '@nestjs/common';
import { CheckConfigCommandService } from './services/check-config.service';
import { Command, Option, Positional } from 'nestjs-command';
import { CollectionCommandService } from './services/collection.service';
import { DeployContractService } from './services/deploy-contract.service';

@Injectable()
export class CliCommands {
  constructor(
    private readonly checkoutConfigService: CheckConfigCommandService,
    private readonly collectionService: CollectionCommandService,
    private readonly deployContractService: DeployContractService,
  ) {}

  @Command({
    command: 'check config',
    describe: 'Checking the collection configuration',
  })
  async showSetting() {
    await this.checkoutConfigService.checkoutCollecetionMain();
  }

  @Command({
    command: 'checkout colllection <id>',
    describe: 'Get collection data',
  })
  async showCollection(
    @Positional({
      name: 'id',
      describe: 'ID collection',
      type: 'string',
    })
    collection: string,
    @Option({
      name: 'token',
      describe: 'Get token ID',
      type: 'string',
      alias: 't',
      required: false,
    })
    token: string,
    @Option({
      name: 'depth',
      describe: 'Object view depth',
      type: 'number',
      alias: 'd',
      default: 1,
      required: false,
    })
    depth: number,
    @Option({
      name: 'wsEndpoint',
      describe: 'WSS Endpoint',
      type: 'string',
      alias: 'w,wss',
      required: false,
    })
    wss: string,
  ) {
    await this.collectionService.showCollection({ collection, token, depth, wss });
  }

  @Command({
    command: 'deploy contract',
    describe: 'Deploy contract',
  })
  async deployContract() {
    await this.deployContractService.init();
    await this.deployContractService.deploy();
  }
}
