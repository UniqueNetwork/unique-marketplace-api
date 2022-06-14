const protobuf = require('protobufjs');
import { hexToU8a } from '@polkadot/util';

import * as logging from '../logging'


export const decodeSchema = schema => {
  let protoJson = JSON.parse(schema);

  let root = protobuf.Root.fromJSON(protoJson);

  let data = {json: protoJson, NFTMeta: null}

  try {
    data.NFTMeta = root.lookupType("onChainMetaData.NFTMeta");
  }
  catch(e) {}

  return data;

}

export const decodeData = (data, schema) => {
  if (schema.NFTMeta === null) return {data: data, human: null}
  let tokenDataBuffer;
  try {
    tokenDataBuffer = hexToU8a(data);
  } catch (e) {
    logging.log(e, logging.level.WARNING)
    return {data: data, human: null}
  }

  let message = schema.NFTMeta.decode(tokenDataBuffer), humanObj = message.toJSON();
  // Maybe convert the message back to a plain object
  let obj = schema.NFTMeta.toObject(message, {
    longs: String,  // longs as strings (requires long.js)
    bytes: String,  // bytes as base64 encoded strings
    defaults: true, // includes default values
    arrays: true,   // populates empty arrays (repeated fields) even if defaults=false
    objects: true,  // populates empty objects (map fields) even if defaults=false
    oneofs: true
  });

  return {data: obj, human: humanObj};
}


const encodeDataBuffer = (schema, payload) => {
  try {
    const NFTMeta = decodeSchema(schema).NFTMeta;

    const errMsg = NFTMeta.verify(payload);

    if (errMsg) {
      throw Error(errMsg);
    }

    const message = NFTMeta.create(payload);

    return NFTMeta.encode(message).finish();
  } catch (e) {
    logging.log('encodeDataBuffer error', logging.level.WARNING);
    logging.log(e, logging.level.ERROR);
  }

  return new Uint8Array(0);
}

export const encodeData = (schema, payload) => {
  return '0x' + Buffer.from(encodeDataBuffer(schema, payload)).toString('hex');
}
