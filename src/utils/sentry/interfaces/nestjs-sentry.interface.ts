import { Handlers } from '@sentry/node';
import { Span, Transaction, Primitive } from '@sentry/types';

export interface TraceOptions {
  name?: string;
  description?: string;
  tags?: Record<string, Primitive>;
}

export type TraceOptionsWithSpan = TraceOptions;

export type TraceDecorator = {
  (name?: string): MethodDecorator;
  (option?: TraceOptions): MethodDecorator;
};

export interface EnhancedHttpRequest extends Handlers.ExpressRequest {
  span?: Span;
  transaction?: Transaction;
}
export interface RpcRequest {
  span?: Span;
  transaction?: Transaction;
}
