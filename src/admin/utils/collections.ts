import { vec2str } from 'src/utils/blockchain/util';
import { DecodedCollection, HumanizedCollection } from '../types/collection';

export const decodeCollection = (collection: HumanizedCollection): DecodedCollection => ({
  ...collection,
  name: vec2str(collection.name),
  description: vec2str(collection.description),
});
