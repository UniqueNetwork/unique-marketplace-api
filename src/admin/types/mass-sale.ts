import { BnList } from '@polkadot/util/types';
import { KeyringPair } from '@polkadot/keyring/types';
import { BN } from '@polkadot/util';

export type TransferResult = {
  tokenId: BN;
  blockNumber: bigint;
};

export type PrepareMassSaleResult = {
  tokenIds: BnList;
  signer: KeyringPair;
};
