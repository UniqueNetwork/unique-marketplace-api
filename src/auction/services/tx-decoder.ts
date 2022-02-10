import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  OnModuleInit,
  ValidationPipe,
} from "@nestjs/common";

import { ApiPromise } from "@polkadot/api";
import {
  BalanceTransferTxInfo,
  BalanceTransferTxInfoDto,
  TokenTransferTxInfo,
  TokenTransferTxInfoDto,
} from "../requests";
import { TxArgs, TxInfo } from "../types";
import { normalizeAccountId, seedToAddress } from "../../utils/blockchain/util";
import { plainToInstance, ClassConstructor } from 'class-transformer';
import { validate } from 'class-validator';
import {decodeAddress, encodeAddress} from "@polkadot/util-crypto";
import {ValidationError} from "@nestjs/common/interfaces/external/validation-error.interface";
import { MarketConfig } from "../../config/market-config";


@Injectable()
export class TxDecoder implements OnModuleInit {
  private readonly logger = new Logger(TxDecoder.name);
  private readonly exceptionFactory: (validationErrors?: ValidationError[]) => unknown;
  private marketAuctionAddress: string;

  constructor(
    @Inject('KUSAMA_API') private kusamaApi: ApiPromise,
    @Inject('UNIQUE_API') private uniqueApi: ApiPromise,
    @Inject('CONFIG') private config: MarketConfig,
  ) {
    this.exceptionFactory = new ValidationPipe().createExceptionFactory();
  }

  async decodeUniqueTransfer(tx: string): Promise<TokenTransferTxInfo> {
    const txInfo = this.decodeTx(this.uniqueApi, tx);

    const normalizedAccount = normalizeAccountId(txInfo.args.recipient);
    if ('Substrate' in normalizedAccount) {
      txInfo.args.recipient = normalizedAccount.Substrate;
    }

    const validTx = await this.transformAndValidate(TokenTransferTxInfoDto, txInfo);

    this.checkRecipient(validTx.args.recipient);

    return validTx;
  }

  async decodeBalanceTransfer(tx: string): Promise<BalanceTransferTxInfo> {
    const txInfo = this.decodeTx(this.kusamaApi, tx);

    txInfo.signerAddress = encodeAddress(decodeAddress(txInfo.signerAddress));

    if (typeof txInfo.args.dest === 'object') {
      txInfo.args.dest = encodeAddress(decodeAddress(txInfo.args.dest.id));
    }

    const validTx = await this.transformAndValidate(BalanceTransferTxInfoDto, txInfo);

    this.checkRecipient(validTx.args.dest);

    return validTx;
  }

  private checkRecipient(recipient: string): void {
    if (recipient !== this.marketAuctionAddress) {
      throw new BadRequestException(
        `Recipient of transfer should be market account (${this.marketAuctionAddress})`
      );
    }
  }

  private async transformAndValidate<T extends object>(classConstructor: ClassConstructor<T>, txInfo: TxInfo): Promise<T> {
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

  async onModuleInit(): Promise<void> {
    if (this.config.auction.seed) {
      this.marketAuctionAddress = await seedToAddress(this.config.auction.seed);
    }
  }
}

