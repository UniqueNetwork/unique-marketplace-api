import * as mainnetTypes from '@unique-nft/unique-mainnet-types/definitions';
import * as opalTypes from '@unique-nft/opal-testnet-types/definitions';

export function RPC(type: string) {
  if (type === 'quartz') {
    return mainnetTypes.unique.rpc; //quartzTypes.unique.rpc;
  }
  if (type === 'opal') {
    return opalTypes.unique.rpc;
  }
  return mainnetTypes.unique.rpc;
}
