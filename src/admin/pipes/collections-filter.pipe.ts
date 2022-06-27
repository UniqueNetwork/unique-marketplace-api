import { PipeTransform, Injectable, ArgumentMetadata, BadRequestException } from '@nestjs/common';
import { TransformationResult } from '../../utils/type-generators/transformation-result';
import { CollectionsFilter } from '../dto/collections.dto';
import { UntypedRequest } from '../../utils/type-generators/untyped-request';
import { isInt, isPositive } from 'class-validator';
import { U32_MAX_VALUE } from '../constants';

@Injectable()
export class CollectionsFilterPipe implements PipeTransform<any, TransformationResult<CollectionsFilter>> {
  transform(params: UntypedRequest<CollectionsFilter>, metadata: ArgumentMetadata): TransformationResult<CollectionsFilter> {
    if (metadata?.metatype?.name !== 'CollectionsFilter') {
      return params;
    }

    const value = new CollectionsFilter();

    if (params.collectionId) {
      const collectionId = Number(params.collectionId);

      if (!isInt(collectionId) || !isPositive(collectionId) || collectionId > U32_MAX_VALUE)
        throw new BadRequestException('Please enter valid ID');

      value.collectionId = collectionId;
    }

    return value;
  }
}
