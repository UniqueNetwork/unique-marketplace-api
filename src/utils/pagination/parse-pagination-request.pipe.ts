import { ArgumentMetadata, HttpStatus, Injectable, Optional, PipeTransform } from '@nestjs/common';
import { ErrorHttpStatusCode, HttpErrorByCode } from '@nestjs/common/utils/http-error-by-code.util';

import { TransformationResult } from '../type-generators/transformation-result';
import { UntypedRequest } from '../type-generators/untyped-request';
import { PaginationRequest } from './pagination-request';
import { parseIntRequest } from '../parsers';

export interface ParsePaginationRequestPipeOptions {
  errorHttpStatusCode?: ErrorHttpStatusCode;
  exceptionFactory?: (error: string) => any;
}

@Injectable()
export class ParsePaginationRequestPipe implements PipeTransform<any, TransformationResult<PaginationRequest>> {
  protected exceptionFactory: (error: string) => any;

  constructor(@Optional() options?: ParsePaginationRequestPipeOptions) {
    options = options || {};
    const { exceptionFactory, errorHttpStatusCode = HttpStatus.BAD_REQUEST } = options;

    this.exceptionFactory = exceptionFactory || ((error) => new HttpErrorByCode[errorHttpStatusCode](error));
  }

  transform(value: UntypedRequest<PaginationRequest>, metadata: ArgumentMetadata): TransformationResult<PaginationRequest> {
    if (metadata?.metatype?.name !== 'PaginationRequest') {
      return value;
    }

    return new PaginationRequest({
      page: this.parsePositiveInt(value.page, 'page'),
      pageSize: this.parsePositiveInt(value.pageSize, 'pageSize'),
    });
  }

  parsePositiveInt(value: string | undefined, paramName: string): number | undefined {
    const int = parseIntRequest(value, () => {
      throw this.exceptionFactory(`Failed to parse int parameter ${paramName}, value: ${value}`);
    });

    if (int != undefined && int <= 0) {
      throw this.exceptionFactory(`Parameter ${paramName} must be a positive integer, value: ${value}`);
    }

    return int;
  }
}
