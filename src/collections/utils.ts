import { AnyJson } from '@polkadot/types/types';
import { vec2str } from 'src/utils/blockchain/util';
import { DecodedCollection } from './types';

export const decodeCollection = (collection: AnyJson): DecodedCollection => ({
  owner: collection['owner'],
  mode: collection['mode'],
  access: collection['access'],
  tokenPrefix: collection['tokenPrefix'],
  mintMode: collection['mintMode'],
  name: vec2str(collection['name']),
  description: vec2str(collection['description']),
});
