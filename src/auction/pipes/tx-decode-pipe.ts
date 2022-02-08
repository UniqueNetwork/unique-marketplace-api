import { ApiPromise } from "@polkadot/api";
import {
  BadRequestException,
  Inject,
  Injectable,
  PipeTransform,
  ArgumentMetadata,
} from "@nestjs/common";
import { TxArgs, TxInfo } from "../types";

class TxDecodePipe implements PipeTransform<unknown, TxInfo> {
  constructor(private readonly api: ApiPromise) {}

  private static buildError(metadata: ArgumentMetadata, message: string): BadRequestException {
    const property = metadata.data ? `property ${metadata.data}` : 'data';
    const request = metadata.type ?? `request`;

    const fullMessage = `Failed to decode extrinsic (${property} in ${request}): ${message}`;

    return new BadRequestException(fullMessage);
  }

  transform(value: unknown, metadata: ArgumentMetadata): TxInfo {
    if (typeof value !== 'string') {
      throw TxDecodePipe.buildError(metadata, 'is not a string');
    }

    try {
      const extrinsic = this.api.createType('Extrinsic', value);
      const call = this.api.createType('Call', extrinsic.method);

      const argsDef = JSON.parse(call.Type.args);

      const args = Object.keys(argsDef).reduce((acc, key, index) => {
        const asJson = call.args[index].toJSON();
        const value = typeof asJson === 'object' ? asJson : call.args[index].toString();

        return {...acc, [key]: value };
      }, {} as TxArgs);

      return {
        address: extrinsic.signer.toString(),
        method: call.method,
        section: call.section,
        args,
      }
    } catch (error) {
      console.error(error);

      throw TxDecodePipe.buildError(metadata, error);
    }
  }
}

@Injectable()
export class UniqueApiTxDecodePipe extends TxDecodePipe {
  constructor(@Inject('UniqueApi') api: ApiPromise) {
    super(api);
  }
}

@Injectable()
export class KusamaApiTxDecodePipe extends TxDecodePipe {
  constructor(@Inject('KusamaApi') api: ApiPromise) {
    super(api);
  }
}
