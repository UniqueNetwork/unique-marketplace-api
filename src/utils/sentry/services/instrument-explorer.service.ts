import { Injectable, OnModuleInit } from '@nestjs/common';
import { DiscoveryService, MetadataScanner } from '@nestjs/core';
import { InstanceWrapper } from '@nestjs/core/injector/instance-wrapper';
import { InjectSentry } from '../decorators';
import { TraceOptionsWithSpan } from '../interfaces';
import { SentryService } from './sentry.service';
import { InstrumentMetadataAccessor } from './instrument-metadata.accessor';

@Injectable()
export class InstrumentExplorer implements OnModuleInit {

    constructor(
        private readonly discovery: DiscoveryService,
        private readonly metadataAccessor: InstrumentMetadataAccessor,
        private readonly metadataScanner: MetadataScanner,
        @InjectSentry() private readonly sentryService: SentryService,
    ) { }

    onModuleInit() {

        this.explore()

    }

    explore() {

        const wrappers = this.discovery.getProviders()

        wrappers.forEach( ( wrapper ) => {

            const { instance, metatype } = wrapper

            if ( !instance ) {

                return;

            }

            this.metadataScanner.scanFromPrototype(
                instance,
                Object.getPrototypeOf( instance ),
                ( key: string ) => {

                    if ( this.metadataAccessor.isTraceMethod( instance[ key ] ) ) {

                        this.trace( wrapper, key )

                        return;

                    }

                    if ( this.metadataAccessor.isInstrumentProvider( metatype ) ) {

                        this.trace( wrapper, key )

                    }

                },
            );

        } )

    }

    trace( wrapper: InstanceWrapper, key: string ) {

        const { instance, metatype } = wrapper

        const instrumentName = this.metadataAccessor.getInstrumentName( metatype ) ?? instance.constructor.name

        const traceOptions: TraceOptionsWithSpan = this.metadataAccessor
            .getTraceMetadata( instance[ key ] ) ?? { name: instance[ key ].name }

        const _original = instance[ key ]

        const _wrapped = ( ...args: any[] ) => {

            const spanContext = {
                op: `${instrumentName}#${traceOptions.name}`,
                ...traceOptions
            }

            // we want to know if there's already an existing transaction or span
            const maybeParent = Boolean( this.sentryService.currentSpan ?? this.sentryService.currentTransaction )

            // otherwise, we create a custom transaction
            const parent = maybeParent
                ? this.sentryService.currentSpan ?? this.sentryService.currentTransaction
                : this.sentryService.createTransaction( { ...spanContext, name: spanContext.op } )


            const span = parent.startChild( spanContext )

            this.sentryService.setSpanOnCurrentScope( span )

            const result = _original.call( instance )

            if ( _original.constructor.name === 'AsyncFunction' ) {

                return result.finally( () => {

                    if( !maybeParent ) {

                        parent.finish()

                    }

                    span.finish()

                } )

            }

            span.finish()

            return result

        }

        instance[ key ] = _wrapped

    }

}
