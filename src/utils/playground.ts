import { Command, Positional } from 'nestjs-command';
import { Injectable } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';

@Injectable()
export class PlaygroundCommand {
  constructor(private moduleRef: ModuleRef) {}

  @Command({
    command: 'playground <playground>',
    describe: 'Run playground',
  })
  async playground(@Positional({ name: 'playground' }) playground: string, @Positional({ name: 'arg' }) arg: string[]) {
    const args = typeof arg === 'undefined' ? [] : arg;
    let module;
    try {
      module = await import(`./playground/${playground}`);
    } catch (e) {
      if (e.code === 'MODULE_NOT_FOUND') {
        console.log(`No playground named "${playground}"`);
        return;
      } else {
        throw e;
      }
    }
    await module.main(this.moduleRef, args);
  }
}
