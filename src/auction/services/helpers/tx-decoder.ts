import { BadRequestException, Inject, Injectable, Logger, ValidationPipe } from '@nestjs/common';

import { ApiPromise } from '@polkadot/api';
import { BalanceTransferTxInfo, BalanceTransferTxInfoDto, TokenTransferTxInfo, TokenTransferTxInfoDto } from '../../requests';
import { TxArgs, TxInfo } from '../../types';
import { convertAddress, normalizeAccountId } from '../../../utils/blockchain/util';
import { plainToInstance, ClassConstructor } from 'class-transformer';
import { validate } from 'class-validator';
import { ValidationError } from '@nestjs/common/interfaces/external/validation-error.interface';
import { AuctionCredentials } from '../../providers';
import { InjectKusamaAPI, InjectUniqueAPI } from '../../../blockchain';

@Injectable()
export class TxDecoder {
  private readonly logger = new Logger(TxDecoder.name);
  private readonly exceptionFactory: (validationErrors?: ValidationError[]) => unknown;

  private marketAuctionUniqueAddress: string;
  private marketAuctionKusamaAddress: string;

  constructor(
    @InjectKusamaAPI() private kusamaApi: ApiPromise,
    @InjectUniqueAPI() private uniqueApi: ApiPromise,
    @Inject('AUCTION_CREDENTIALS') private auctionCredentials: AuctionCredentials,
  ) {
    this.exceptionFactory = new ValidationPipe().createExceptionFactory();
    this.marketAuctionUniqueAddress = this.auctionCredentials.uniqueAddress;
    this.marketAuctionKusamaAddress = this.auctionCredentials.kusamaAddress;
  }

  async decodeUniqueTransfer(tx: string): Promise<TokenTransferTxInfo> {
    const txInfo = this.decodeTx(this.uniqueApi, tx);

    const normalizedAccount = normalizeAccountId(txInfo.args.recipient);
    if ('Substrate' in normalizedAccount) {
      txInfo.args.recipient = normalizedAccount.Substrate;
    }

    const validTx = await this.transformAndValidate(TokenTransferTxInfoDto, txInfo);

    TxDecoder.checkRecipient(this.marketAuctionUniqueAddress, validTx.args.recipient);

    return validTx;
  }

  async decodeBalanceTransfer(tx: string): Promise<BalanceTransferTxInfo> {
    const txInfo = this.decodeTx(this.kusamaApi, tx);

    txInfo.signerAddress = await convertAddress(txInfo.signerAddress, this.kusamaApi.registry.chainSS58);

    if (typeof txInfo.args.dest === 'object') {
      txInfo.args.dest = await convertAddress(txInfo.args.dest.id, this.kusamaApi.registry.chainSS58);
    }

    const validTx = await this.transformAndValidate(BalanceTransferTxInfoDto, txInfo);

    TxDecoder.checkRecipient(this.marketAuctionKusamaAddress, validTx.args.dest);

    return validTx;
  }

  private static checkRecipient(market: string, recipient: string): void {
    if (recipient !== market) {
      throw new BadRequestException(`Recipient of transfer should be market account (${market})`);
    }
  }

  private async transformAndValidate<T extends Record<string, any>>(classConstructor: ClassConstructor<T>, txInfo: TxInfo): Promise<T> {
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

        return { ...acc, [key]: value };
      }, {} as TxArgs);

      return {
        isSigned: extrinsic.isSigned,
        signerAddress: extrinsic.signer.toString(),
        method: call.method,
        section: call.section,
        args,
      };
    } catch (error) {
      this.logger.error(error);

      throw new BadRequestException(error.message);
    }
  }
}
