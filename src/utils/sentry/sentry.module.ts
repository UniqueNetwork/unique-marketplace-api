import { DynamicModule, Module, Provider } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import { SENTRY, SENTRY_MODULE_OPTIONS } from './constants';
import { SentryModuleAsyncOptions, SentryModuleOptions, SentryModuleOptionsFactory } from './interfaces';
import { HttpInterceptorService } from './interceptors/http-interceptor.service';
import { SentryService } from './services';
import { BootstrapSentry } from './services/bootstrap-sentry.service';
import { InstrumentExplorer } from './services/instrument-explorer.service';
import { InstrumentMetadataAccessor } from './services/instrument-metadata.accessor';
import { NoopInterceptorService } from './interceptors/noop-interceptor.service';

@Module({
    imports: [DiscoveryModule],
    providers: [BootstrapSentry, InstrumentMetadataAccessor, InstrumentExplorer, HttpInterceptorService, NoopInterceptorService],
    exports: [HttpInterceptorService, NoopInterceptorService],
})
export class SentryModule {
    static forRoot(options: SentryModuleOptions): DynamicModule {
        return {
            module: SentryModule,
            exports: this.createProviders(options),
            providers: this.createProviders(options),
        };
    }

    static forRootAsync(options: SentryModuleAsyncOptions): DynamicModule {
        return {
            global: true,
            module: SentryModule,
            exports: this.createAsyncProviders(options),
            providers: this.createAsyncProviders(options),
            imports: options.imports ?? [],
        };
    }

    private static createProviders(options: SentryModuleOptions): Provider[] {
        return [
            {
                provide: SENTRY,
                useClass: SentryService,
            },
            {
                provide: SENTRY_MODULE_OPTIONS,
                useValue: options,
            },
        ];
    }

    private static createAsyncProviders(options: SentryModuleAsyncOptions): Provider[] {
        if (options.useExisting || options.useFactory) {
            return this.createAsyncOptionsProvider(options as any);
        }

        return [
            ...this.createAsyncOptionsProvider(options as any),
            {
                provide: (options as any).useClass,
                useClass: (options as any).useClass,
            },
        ];
    }

    private static createAsyncOptionsProvider(options: SentryModuleAsyncOptions): Provider[] {
        if (options.useFactory) {
            return [
                {
                    provide: SENTRY_MODULE_OPTIONS,
                    useFactory: options.useFactory,
                    inject: options.inject ?? [],
                },
                {
                    provide: SENTRY,
                    useClass: SentryService,
                },
            ];
        }

        return [
            {
                provide: SENTRY_MODULE_OPTIONS,
                useFactory: async (optionsFactory: SentryModuleOptionsFactory) => optionsFactory.createNestjsSentryModuleOptions(),
                inject: [options.useExisting ?? options.useClass],
            },
            {
                provide: SENTRY,
                useClass: SentryService,
            },
        ];
    }
}
