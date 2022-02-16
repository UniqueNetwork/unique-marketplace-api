import { ApiPromise } from '@polkadot/api';
import { Inject, Injectable } from "@nestjs/common";

@Injectable()
export class TransferService {

  constructor(
    @Inject('KUSAMA_API') private kusamaApi: ApiPromise,
    @Inject('UNIQUE_API') private uniqueApi: ApiPromise
  ) {

  }
}