import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GqlContextType } from '@nestjs/graphql';
import { EnhancedHttpRequest, RpcRequest } from '../interfaces';

export const CurrentSpan = createParamDecorator((data: unknown, context: ExecutionContext) => {
  const contextType = context.getType<GqlContextType>();

  switch (contextType) {
    case 'http':
      return context.switchToHttp().getRequest<EnhancedHttpRequest>().span;

    case 'rpc':
      return context.switchToRpc().getContext<RpcRequest>().span;

    case 'ws':
      return undefined;

    case 'graphql':
      return undefined;
  }
});

export const CurrentTransaction = createParamDecorator((data: unknown, context: ExecutionContext) => {
  const contextType = context.getType<GqlContextType>();

  switch (contextType) {
    case 'http':
      return context.switchToHttp().getRequest<EnhancedHttpRequest>().transaction;

    case 'rpc':
      return undefined;

    case 'ws':
      return undefined;

    case 'graphql':
      return undefined;
  }
});
