import { ApiProperty } from '@nestjs/swagger';

import { Dto } from '../dto';
import { ClassToDto } from '../type-generators/class-to-dto';
import { SortingParameter } from './sorting-parameter';

export class OfferSortingRequest {
    @ApiProperty({
        items: { type: 'string', default: 'desc(CreationDate)' },
        description: 'Possible values: asc(Price), desc(Price), asc(TokenId), desc(TokenId), asc(CreationDate), desc(CreationDate).',
        required: false,
    })
    public sort?: SortingParameter[];

    constructor(value: ClassToDto<OfferSortingRequest>) {
        Dto.init(this, value);
    }
}

export class TradeSortingRequest {
    @ApiProperty({
        items: { type: 'string', default: 'desc(TradeDate)' },
        description:
            'Possible values: asc(Price), desc(Price), asc(TokenId), desc(TokenId), asc(CollectionId), desc(CollectionId), asc(TradeDate), desc(TradeDate).',
        required: false,
    })
    public sort?: SortingParameter[];

    constructor(value: ClassToDto<TradeSortingRequest>) {
        Dto.init(this, value);
    }
}
