import { ExecutionContext } from "@nestjs/common";

export interface TraceInterceptorService {

    onRequest( context: ExecutionContext ): void;

    onSuccess( value: any, context: ExecutionContext ): void;

    onFailure( exception: any, context: ExecutionContext ): void;

}
