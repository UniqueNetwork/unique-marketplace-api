import { Inject, Injectable, OnApplicationShutdown } from "@nestjs/common";
import { HttpAdapterHost } from "@nestjs/core";
import * as Sentry from '@sentry/node';
import * as Tracing from '@sentry/tracing';
import { Integration, Options } from "@sentry/types";
import { SENTRY_MODULE_OPTIONS } from "../constants";
import { SentryModuleOptions } from "../interfaces";

@Injectable()
export class BootstrapSentry implements OnApplicationShutdown {

    constructor(
        private readonly adapterHost: HttpAdapterHost,
        @Inject( SENTRY_MODULE_OPTIONS )
        private readonly options: SentryModuleOptions,
    ) {

        const { expressTracing, integrations, ...restOptions } = options;
        let _integrations: Options['integrations'];

        if ( expressTracing ) {

            const expressTracingIntegrations: Integration[] = [
                new Sentry.Integrations.Http( { tracing: true } ),
                new Tracing.Integrations.Express( {
                    app: adapterHost.httpAdapter.getInstance(),
                } ),
            ];

            _integrations = integrations
                ? typeof integrations === 'function'
                    ? () => expressTracingIntegrations.concat( integrations( [] ) )
                    : expressTracingIntegrations.concat( integrations )
                : expressTracingIntegrations;

            adapterHost.httpAdapter.use( Sentry.Handlers.requestHandler() );
            adapterHost.httpAdapter.use( Sentry.Handlers.tracingHandler() );
            adapterHost.httpAdapter.use( Sentry.Handlers.errorHandler() );

        }

        Sentry.init( {
            ...restOptions,
            integrations: _integrations,
        } );

    }

    async onApplicationShutdown() {

        await Sentry.close();

    }

}
