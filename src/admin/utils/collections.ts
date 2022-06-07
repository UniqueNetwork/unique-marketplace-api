import { vec2str } from '../../utils/blockchain/util';
import { DecodedCollection, HumanizedCollection } from '../types/collection';

export const decodeCollection = (collection: HumanizedCollection): DecodedCollection => ({
  owner: collection?.owner,
  mode: collection?.mode,
  tokenPrefix: collection?.tokenPrefix,
  name: collection?.name ? vec2str(collection.name) : null,
  description: collection?.description ? vec2str(collection.description) : null,
});
