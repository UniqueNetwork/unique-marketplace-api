import { UntypedRequest } from './../../utils/type-generators/untyped-request';
import { TransformationResult } from './../../utils/type-generators/transformation-result';
import { ArgumentMetadata, Injectable, PipeTransform } from "@nestjs/common";
import { OfferAttributesDto } from '../dto';
import { parseCollectionIdRequest } from './../../utils/parsers';

@Injectable()
export class ParseOffersAttributes implements PipeTransform<any, TransformationResult<OfferAttributesDto>>{
  transform(value: UntypedRequest<OfferAttributesDto>,
    metadata: ArgumentMetadata): TransformationResult<OfferAttributesDto> {
      if (metadata?.metatype?.name !== 'OfferAttributesDto') {
        return value;
      }

      return new OfferAttributesDto({
        collectionId: parseCollectionIdRequest(value.collectionId)
      })
    }
}