import { Injectable, Logger } from "@nestjs/common";
import { ApiPromise } from "@polkadot/api";
import { Hash } from "@polkadot/types/interfaces";
import { SubmittableExtrinsic } from "@polkadot/api/types";

export type SubmitResult = {
  isSucceed: boolean;
  blockNumber: bigint;
}


@Injectable()
export class ExtrinsicSubmitter {
  private readonly logger = new Logger(ExtrinsicSubmitter.name);

  async submit(api: ApiPromise, tx: string | SubmittableExtrinsic<any>): Promise<SubmitResult> {
    const extrinsic = typeof tx === 'string' ? api.createType('Extrinsic', tx) : tx;

    return new Promise(async (resolve, reject) => {
      let unsubscribe = () => {
        // do nothing
      };

      try {
        unsubscribe = await api.rpc.author.submitAndWatchExtrinsic(extrinsic, async (status): Promise<void> => {
          this.logger.debug(status);

          switch (status.type) {
            case 'FinalityTimeout':
            case 'Usurped':
            case 'Dropped':
            case 'Invalid': {
              this.logger.error(status.toJSON());
              unsubscribe();

              reject(new Error(`Failed with status ${status.type}`));
              break;
            }
            case 'Finalized': {
              this.logger.log(status.toJSON());
              unsubscribe();

              try {
                const txResult = await ExtrinsicSubmitter.checkIsSucceed(api, extrinsic.hash, status.asFinalized);

                if (txResult.isSucceed) {
                  resolve(txResult);
                } else {
                  reject(new Error(`Failed at block # ${txResult.blockNumber} (${status.asFinalized.toHex()})`));
                }
              } catch (error) {
                reject(new Error(`unexpected error: ${error.toString()}`));
              }

              break;
            }
            default: {
              this.logger.log(status.toJSON());
            }
          }
        });
      } catch (error) {
        unsubscribe();
        this.logger.error(error);

        reject(error);
      }
    });
  }

  private static async checkIsSucceed(api: ApiPromise, extrinsicHash: Hash, blockHash: Hash): Promise<SubmitResult> {
    const [signedBlock, eventsAtBlock] = await Promise.all([
      api.rpc.chain.getBlock(blockHash),
      api.query.system.events.at(blockHash),
    ]);

    const finalizedExtrinsicIndex = signedBlock.block.extrinsics.findIndex((ex) => ex.hash.eq(extrinsicHash));

    const finalizedExtrinsicEvents = eventsAtBlock.filter((event) => {
      return event.phase.isApplyExtrinsic && event.phase.asApplyExtrinsic.eq(finalizedExtrinsicIndex);
    });

    const isSucceed = finalizedExtrinsicEvents.some((event) => api.events.system.ExtrinsicSuccess.is(event.event));

    return {
      isSucceed,
      blockNumber: signedBlock.block.header.number.toBigInt(),
    }
  }
}
