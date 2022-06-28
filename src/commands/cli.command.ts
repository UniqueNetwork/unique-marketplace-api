import { Injectable } from '@nestjs/common';
import { CheckConfigCommandService } from './services/check-config.service';
import { Command, CommandPositionalOption, Option, Positional } from 'nestjs-command';
import { CollectionCommandService } from './services/collection.service';
import { DeployContractService } from './services/deploy-contract.service';

@Injectable()
export class CliCommands {
  constructor(
    private readonly checkoutConfigService: CheckConfigCommandService,
    private readonly collectionService: CollectionCommandService,
    private readonly deployContractService: DeployContractService,
  ) {}

  /**
   *
   */
  @Command({
    command: 'check config',
    describe: 'Checking the collection configuration',
  })
  async showSetting() {
    await this.checkoutConfigService.checkoutCollecetionMain();
  }

  /**
   * Deploy contract
   */
  @Command({
    command: 'deploy contract',
    describe: 'Deploy contract',
  })
  async deployContract() {
    await this.deployContractService.init();
    await this.deployContractService.deploy();
  }

  /**
   *
   * @param collection
   * @param token
   * @param depth
   * @param wss
   */
  @Command({
    command: 'check collection <id>',
    describe: 'Get collection data',
  })
  async showCollections(
    @Positional({ name: 'id', describe: 'ID collection', type: 'string' } as CommandPositionalOption)
    collection: string,
    @Option({ name: 'token', describe: 'Get token ID', type: 'string', alias: 't', required: false } as CommandPositionalOption)
    token: string,
    @Option({
      name: 'depth',
      describe: 'Object view depth',
      type: 'string',
      alias: 'd',
      default: 1,
      required: false,
    } as CommandPositionalOption)
    depth: number,
    @Option({ name: 'wsEndpoint', describe: 'WSS Endpoint', type: 'string', alias: 'w', required: false } as CommandPositionalOption)
    wss: string,
  ) {
    const data = { collection, token, depth, wss };
    await this.collectionService.showCollection(data);
  }
}
