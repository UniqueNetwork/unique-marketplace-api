import { Inject, Injectable, Logger } from "@nestjs/common";
import { InjectSentry, SentryService } from "src/utils/sentry";
import { Connection, SelectQueryBuilder } from "typeorm";
import { OffersService } from "./offers.service";
import { ContractAsk } from '../entity';

@Injectable()
export class OffersFilterService {

  private logger: Logger;

  constructor(
    @Inject('DATABASE_CONNECTION') private connection: Connection,
    @InjectSentry() private readonly sentryService: SentryService,
  ) {
    this.logger = new Logger(OffersService.name);
  }


  public addSearchIndex(queryBuilder: SelectQueryBuilder<ContractAsk>): SelectQueryBuilder<ContractAsk> {
    return queryBuilder;
  }

}