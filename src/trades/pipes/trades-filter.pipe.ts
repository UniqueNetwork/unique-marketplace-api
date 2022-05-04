import { UntypedRequest } from '../../utils/type-generators/untyped-request';
import { TradesFilter } from '../dto';
import { TransformationResult } from '../../utils/type-generators/transformation-result';
import { ArgumentMetadata, HttpStatus, Injectable, Optional, PipeTransform } from "@nestjs/common";
import { ErrorHttpStatusCode, HttpErrorByCode } from '@nestjs/common/utils/http-error-by-code.util';
import { parseCollectionIdRequest, requestArray } from '../../utils/parsers';


export interface ParseTradesFilterPipeOptions {
  errorHttpStatusCode?: ErrorHttpStatusCode;
  exceptionFactory?: (error: string) => any;
}

@Injectable()
export class ParseTradesFilterPipe implements PipeTransform<any, TransformationResult<TradesFilter>> {
  protected exceptionFactory: (error: string) => any;

  constructor(@Optional() options?: ParseTradesFilterPipeOptions) {
    options = options || {};
    const { exceptionFactory, errorHttpStatusCode = HttpStatus.BAD_REQUEST } = options;

    this.exceptionFactory = exceptionFactory || ((error) => new HttpErrorByCode[errorHttpStatusCode](error));
  }

  transform(value: UntypedRequest<TradesFilter>, metadata: ArgumentMetadata): TransformationResult<TradesFilter> {
    if (metadata?.metatype?.name !== 'TradesFilter') {
      return value;
    }

    return new TradesFilter({
      collectionId: parseCollectionIdRequest(value.collectionId),
      tokenId: parseCollectionIdRequest(value.tokenId),
      searchText: value.searchText,
      traits: requestArray(value.traits).filter((id) => id != null) as string[]
    });
  }
}