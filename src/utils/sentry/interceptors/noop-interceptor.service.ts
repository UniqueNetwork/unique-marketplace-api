import { ExecutionContext, Injectable } from "@nestjs/common";
import { TraceInterceptorService } from "../interfaces/trace-interceptor.interface";

@Injectable()
export class NoopInterceptorService implements TraceInterceptorService {

    onRequest( context: ExecutionContext ) {
        // noop
    }

    onSuccess( value: any, context: ExecutionContext ) {
        // noop
    }

    onFailure( exception: any, context: ExecutionContext ) {
        // noop
    }

}
