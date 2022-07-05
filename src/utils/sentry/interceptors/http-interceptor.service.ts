import { ExecutionContext, Injectable } from '@nestjs/common';
import { HttpArgumentsHost } from '@nestjs/common/interfaces';
import { Handlers } from '@sentry/node';
import { Scope } from '@sentry/types';
import { EnhancedHttpRequest } from '../interfaces';
import { InjectSentry } from '../decorators';
import { SentryService } from '../services';
import { TraceInterceptorService } from '../interfaces/trace-interceptor.interface';

@Injectable()
export class HttpInterceptorService implements TraceInterceptorService {
  constructor(@InjectSentry() private readonly sentryService: SentryService) {}

  onRequest(context: ExecutionContext) {
    const transaction = this.sentryService.currentTransaction;
    const span = this.sentryService.currentSpan;

    const httpContext = context.switchToHttp();
    const httpRequest = httpContext.getRequest<EnhancedHttpRequest>();

    transaction.setData('baseUrl', httpRequest.baseUrl);
    transaction.setData('query', httpRequest.query);
    transaction.name = `${httpRequest.method} ${httpRequest.route.path}`;
    transaction.op = `${httpRequest.method} ${httpRequest.route.path}`;
    span.op = `${context.getClass().name}#${context.getHandler().name}`;
    span.description = httpRequest.url;
    httpRequest.span = span;
    httpRequest.transaction = transaction;
  }

  onSuccess(value: any, context: ExecutionContext) {
    const transaction = this.sentryService.currentTransaction;
    const span = this.sentryService.currentSpan;

    const httpContext = context.switchToHttp();

    this.captureHttpData(this.sentryService.currentScope, httpContext, value);
    span.finish();

    if ((transaction as any).__customTrace) {
      transaction.finish();
    }
  }

  onFailure(exception: any, context: ExecutionContext) {
    const httpContext = context.switchToHttp();

    this.sentryService.instance().withScope((scope) => this.captureHttpData(scope, httpContext, null, exception));
  }

  private captureHttpData(scope: Scope, httpArgs: HttpArgumentsHost, data?: any, exception?: any) {
    const req = httpArgs.getRequest();
    const res = httpArgs.getResponse();
    const statusCode = res.statusCode;

    const eventData = Handlers.parseRequest({}, req, {});

    if (eventData.extra) {
      scope.setExtras(eventData.extra);
    }

    if (eventData.user) {
      scope.setUser(eventData.user);
    }

    if (data) {
      const transaction = scope.getTransaction();
      transaction.setData('res', data);
      transaction.setHttpStatus(statusCode);
      transaction.setTag('http.status_code', statusCode);
    }

    if (exception) {
      this.sentryService.captureException(exception);
    }
  }
}
