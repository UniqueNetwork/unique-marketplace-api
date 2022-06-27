import { Injectable } from '@nestjs/common';
import { Command, Positional, Option } from 'nestjs-command';
import { CollectionCommandService } from './services/collection.service';

@Injectable()
export class CollectionCommand {
  constructor(private readonly collectionService: CollectionCommandService) {}

  @Command({
    command: 'collection <id>',
    describe: 'Get collection data',
  })
  async create(
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
}
