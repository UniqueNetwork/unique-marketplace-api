import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { GqlContextType } from '@nestjs/graphql';
import { tap } from "rxjs";
import { InjectSentry } from "../decorators";
import { TraceInterceptorService } from "../interfaces/trace-interceptor.interface";
import { SentryService } from "../services";
import { HttpInterceptorService } from "./http-interceptor.service";
import { NoopInterceptorService } from "./noop-interceptor.service";

@Injectable()
export class TraceInterceptor implements NestInterceptor {

    constructor(
        @InjectSentry() private readonly sentryService: SentryService,
        private readonly httpInterceptorService: HttpInterceptorService,
        private readonly noopInterceptorService: NoopInterceptorService
    ) { }

    intercept( context: ExecutionContext, next: CallHandler ) {

        const contextType = context.getType<GqlContextType>()

        const interceptorService = this.getInterceptorForContext( contextType )

        const response = this.handleRequest( context, next )

        return response.pipe(
            tap( {
                next: ( value ) => interceptorService.onSuccess( value, context ),
                error: exception => interceptorService.onFailure( exception, context )
            } )

        )

    }

    handleRequest( context: ExecutionContext, next: CallHandler ) {

        // a transaction maybe present with express integrations
        const maybeTransaction = Boolean( this.sentryService.currentTransaction )

        const transaction = maybeTransaction
            ? this.sentryService.currentTransaction
            : this.sentryService
                .currentHub
                .startTransaction( { name: context.getHandler().name } )

        // if this is a custom transaction, we want to know so we can finish it
        if ( !maybeTransaction ) {

            ( transaction as any ).__customTrace = true

        }

        const span = transaction.startChild()

        this.sentryService.setSpanOnCurrentScope( span );

        this.getInterceptorForContext( context.getType<GqlContextType>() ).onRequest( context )

        return next.handle()

    }

    private getInterceptorForContext( contextType: GqlContextType ): TraceInterceptorService {

        switch( contextType ) {

            case 'http':
                return this.httpInterceptorService

            case 'rpc':
                return this.noopInterceptorService

            case 'ws':
                return this.noopInterceptorService

            case 'graphql':
                return this.noopInterceptorService

        }


    }

}
