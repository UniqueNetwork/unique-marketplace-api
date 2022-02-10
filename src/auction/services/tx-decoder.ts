import {BadRequestException, Inject, Injectable, Logger, ValidationPipe} from "@nestjs/common";

import { ApiPromise } from "@polkadot/api";
import {
  BalanceTransferTxInfo,
  BalanceTransferTxInfoDto,
  TokenTransferTxInfo,
  TokenTransferTxInfoDto,
} from "../requests";
import { TxArgs, TxInfo } from "../types";
import {normalizeAccountId} from "../../utils/blockchain/util";
import { plainToInstance, ClassConstructor } from 'class-transformer';
import { validate } from 'class-validator';
import {decodeAddress, encodeAddress} from "@polkadot/util-crypto";
import {ValidationError} from "@nestjs/common/interfaces/external/validation-error.interface";


@Injectable()
export class TxDecoder {
  private readonly logger = new Logger(TxDecoder.name);
  private readonly exceptionFactory: (validationErrors?: ValidationError[]) => unknown;

  constructor(
    @Inject('KUSAMA_API') private kusamaApi: ApiPromise,
    @Inject('UNIQUE_API') private uniqueApi: ApiPromise,
  ) {
    this.exceptionFactory = new ValidationPipe().createExceptionFactory();
  }

  async decodeUniqueTransfer(tx: string): Promise<TokenTransferTxInfo> {
    const txInfo = this.decodeTx(this.uniqueApi, tx);

    const normalizedAccount = normalizeAccountId(txInfo.args.recipient);
    if ('Substrate' in normalizedAccount) {
      txInfo.args.recipient = normalizedAccount.Substrate;
    }

    const tokenTransferTxInfo = plainToInstance(TokenTransferTxInfoDto, txInfo);
    await this.validate(tokenTransferTxInfo);

    return tokenTransferTxInfo;
  }

  async decodeBalanceTransfer(tx: string): Promise<BalanceTransferTxInfo> {
    const txInfo = this.decodeTx(this.kusamaApi, tx);

    txInfo.signerAddress = encodeAddress(decodeAddress(txInfo.signerAddress));

    if (typeof txInfo.args.dest === 'object') {
      txInfo.args.dest = encodeAddress(decodeAddress(txInfo.args.dest.id));
    }

    return await this.transformAndValidate(BalanceTransferTxInfoDto, txInfo);
  }

  async validate(txInfoDto: any): Promise<void> {
    const errors = await validate(txInfoDto);

    if (errors.length) {
      throw await this.exceptionFactory(errors);
    }
  }

  async transformAndValidate<T extends object>(classConstructor: ClassConstructor<T>, txInfo: TxInfo): Promise<T> {
    const txInfoDto = plainToInstance(classConstructor, txInfo);

    const errors = await validate(txInfoDto);

    if (errors.length) {
      throw await this.exceptionFactory(errors);
    }

    return txInfoDto;
  }

  private decodeTx(api: ApiPromise, tx: string): TxInfo {
    try {
      const extrinsic = api.createType('Extrinsic', tx);
      const call = api.createType('Call', extrinsic.method);

      const argsDef = JSON.parse(call.Type.args);

      const args = Object.keys(argsDef).reduce((acc, key, index) => {
        const asJson = call.args[index].toJSON();
        const value = typeof asJson === 'object' ? asJson : call.args[index].toString();

        return {...acc, [key]: value };
      }, {} as TxArgs);

      return {
        isSigned: extrinsic.isSigned,
        signerAddress: extrinsic.signer.toString(),
        method: call.method,
        section: call.section,
        args,
      }
    } catch (error) {
      this.logger.error(error);

      throw new BadRequestException(error.message);
    }
  }
}

