import { SetMetadata } from '@nestjs/common';
import { SENTRY_TRACE } from '../constants/instrument.tokens';
import { TraceDecorator, TraceOptions, TraceOptionsWithSpan } from '../interfaces';

const propertyKeyToString = (key: string | symbol) => (typeof key === 'string' ? key : key.description);

const getTraceOptions = (propertyKey: string | symbol, nameOrOptions: string | TraceOptions): TraceOptionsWithSpan => {
  const options =
    typeof nameOrOptions === 'string'
      ? {
          name: nameOrOptions,
        }
      : {
          ...nameOrOptions,
          name: nameOrOptions?.name ?? propertyKeyToString(propertyKey),
        };
  return options;
};
/**
 *
 * @param {TraceDecorator} nameOrOptions
 * @constructor
 */
export const Trace: TraceDecorator =
  (nameOrOptions?: string | TraceOptions): MethodDecorator =>
  (target: Record<string, any>, propertyKey: string | symbol, descriptor: TypedPropertyDescriptor<any>) => {
    const options = getTraceOptions(propertyKey, nameOrOptions);
    SetMetadata(SENTRY_TRACE, options)(target, propertyKey, descriptor);
  };
