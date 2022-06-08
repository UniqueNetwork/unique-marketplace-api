import { SubmittableExtrinsic } from '@polkadot/api-base/types';
import type { ISubmittableResult } from '@polkadot/types/types';
import { AddressOrPair } from '@polkadot/api-base/types';

import * as logging from '../logging';

export enum TransactionStatus {
  NOT_READY = 'NotReady',
  FAIL = 'Fail',
  SUCCESS = 'Success',
}

const getTransactionStatus = ({ events, status }: ISubmittableResult) => {
  if (status.isReady) {
    return TransactionStatus.NOT_READY;
  }
  if (status.isBroadcast) {
    return TransactionStatus.NOT_READY;
  }
  if (status.isInBlock || status.isFinalized) {
    const errors = events.filter((e) => e.event.data.method === 'ExtrinsicFailed');
    if (errors.length > 0) {
      return TransactionStatus.FAIL;
    }
    if (events.filter((e) => e.event.data.method === 'ExtrinsicSuccess').length > 0) {
      return TransactionStatus.SUCCESS;
    }
  }

  return TransactionStatus.FAIL;
};

export const signTransaction = (
  senderAccount: AddressOrPair,
  transaction: SubmittableExtrinsic<'promise', ISubmittableResult>,
  label = 'transaction',
): Promise<{ result: ISubmittableResult; status: TransactionStatus }> => {
  return new Promise(async (resolve, reject) => {
    try {
      const unsub = await transaction.signAndSend(senderAccount, (result) => {
        const status = getTransactionStatus(result);

        if (status === TransactionStatus.NOT_READY) {
          return;
        }

        if (status === TransactionStatus.SUCCESS) {
          logging.log(`${label} successful`);
          resolve({ result, status });
        }

        if (status === TransactionStatus.FAIL) {
          logging.log(`Something went wrong with ${label}. Status: ${status}`, logging.level.ERROR);
          logging.log(result.toHuman(), logging.level.ERROR);
          reject({ result, status });
        }

        unsub();
      });
    } catch (e) {
      logging.log(e, logging.level.ERROR);
      reject(e);
    }
  });
};
