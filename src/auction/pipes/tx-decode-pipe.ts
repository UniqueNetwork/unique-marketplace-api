import { ApiPromise } from "@polkadot/api";
import {
  BadRequestException,
  Inject,
  Injectable,
  PipeTransform,
  ArgumentMetadata,
} from "@nestjs/common";
import { TxArgs, TxInfo } from "../types";

@Injectable()
export class TxDecodePipe implements PipeTransform<unknown, TxInfo> {
  constructor(
    @Inject('UniqueApi') private readonly uniqueApi: ApiPromise,
    @Inject('KusamaApi') private readonly kusamaApi: ApiPromise,
  ) {}

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
      let extrinsic;
      let call;

      // todo - split by providers
      try {
        extrinsic = this.uniqueApi.createType('Extrinsic', value);
        call = this.uniqueApi.createType('Call', extrinsic.method);
      } catch (error) {
        extrinsic = this.kusamaApi.createType('Extrinsic', value);
        call = this.kusamaApi.createType('Call', extrinsic.method);
      }

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