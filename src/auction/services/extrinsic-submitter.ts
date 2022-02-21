import {Injectable, Logger} from "@nestjs/common";
import { ApiPromise } from "@polkadot/api";
import { SignedBlock } from "@polkadot/types/interfaces";
import { SubmittableExtrinsic } from "@polkadot/api/types";


@Injectable()
export class ExtrinsicSubmitter {
  private readonly logger = new Logger(ExtrinsicSubmitter.name);

  async submit(api: ApiPromise, tx: string | SubmittableExtrinsic<any>): Promise<SignedBlock | undefined> {
    this.logger.debug('before submitTransferExtrinsic');

    const extrinsic = typeof tx === 'string'
      ? api.createType('Extrinsic', tx)
      : tx;

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

              reject(status.toJSON());
              break;
            }
            case 'Finalized': {
              this.logger.log(status.toJSON());
              unsubscribe();

              try {
                const block = await api.rpc.chain.getBlock(status.asFinalized);

                resolve(block as any);
              } catch (error) {
                console.error(error);
              }

              resolve(undefined);
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
}