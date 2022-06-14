import { HttpStatus } from '@nestjs/common';
import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ApiPromise } from '@polkadot/api';
import { Hash } from '@polkadot/types/interfaces';
import { IExtrinsic } from '@polkadot/types/types';
import { SubmittableExtrinsic } from '@polkadot/api/types';
import { stringify } from '@polkadot/util';
import '@polkadot/api-augment/polkadot'

export type SubmitResult = {
  isSucceed: boolean;
  blockNumber: bigint;
};

@Injectable()
export class ExtrinsicSubmitter {
  private readonly logger = new Logger(ExtrinsicSubmitter.name);

  async submit(api: ApiPromise, tx: string | SubmittableExtrinsic<any>): Promise<SubmitResult> {
    const extrinsic = typeof tx === 'string' ? api.createType('Extrinsic', tx) : tx;
    const extrinsicHuman = stringify(extrinsic.toHuman());

    const blockHash = await this.waitFinalized(api, extrinsic);
    const txResult = await this.checkIsSucceed(api, extrinsic.hash, blockHash);

    this.logger.debug(`${extrinsicHuman}; ${stringify(txResult)}`);

    if (!txResult.isSucceed) {
      this.logger.warn(`Failed at block # ${txResult.blockNumber} (${blockHash.toHex()})`)
      throw new BadRequestException({
        statusCode: HttpStatus.CONFLICT,
        message: `Failed at block # ${txResult.blockNumber} (${blockHash.toHex()})`
      });
    }

    return txResult;
  }

  private async waitFinalized(api: ApiPromise, extrinsic: IExtrinsic): Promise<Hash> {
    const extrinsicHuman = stringify(extrinsic.toHuman());

    let unsubscribe: VoidFunction = () => {
      this.logger.debug(`${extrinsicHuman}; called noop unsubscribe()`);
    };

    return new Promise(async (resolve, reject) => {
      const checkStatus = (status): void => {
        switch (status.type) {
          case 'FinalityTimeout':
          case 'Usurped':
          case 'Dropped':
          case 'Invalid': {
            this.logger.warn(`${extrinsicHuman}; ${status.type}; ${stringify(status)}`);
            unsubscribe();

            reject(new Error(`Failed with status ${status.type}`));
            break;
          }
          case 'Finalized': {
            this.logger.log(`${extrinsicHuman}; ${status.type}; ${stringify(status)}`);
            unsubscribe();

            resolve(status.asFinalized);
            break;
          }
          default: {
            this.logger.log(`${extrinsicHuman}; ${status.type}; ${stringify(status)}`);
          }
        }
      };

      api.rpc.author
        .submitAndWatchExtrinsic(extrinsic, checkStatus)
        .then((uns) => {
          unsubscribe = uns;
        })
        .catch((error) => {
          unsubscribe();
          this.logger.warn(`${extrinsicHuman}; unexpected submitAndWatchExtrinsic error;  ${error}`);
          reject(error);
        });
    });
  }

  private async checkIsSucceed(api: ApiPromise, extrinsicHash: Hash, blockHash: Hash): Promise<SubmitResult> {
    const [signedBlock, eventsAtBlock] = await Promise.all([api.rpc.chain.getBlock(blockHash), api.query.system.events.at(blockHash)]);

    const finalizedExtrinsicIndex = signedBlock.block.extrinsics.findIndex((ex) => ex.hash.eq(extrinsicHash));

    const finalizedExtrinsicEvents = eventsAtBlock.filter((event) => {
      return event.phase.isApplyExtrinsic && event.phase.asApplyExtrinsic.eq(finalizedExtrinsicIndex);
    });

    const isSucceed = finalizedExtrinsicEvents.some((event) => api.events.system.ExtrinsicSuccess.is(event.event));

    return {
      isSucceed,
      blockNumber: signedBlock.block.header.number.toBigInt(),
    };
  }
}
