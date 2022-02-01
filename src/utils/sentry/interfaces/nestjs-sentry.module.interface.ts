import { ModuleMetadata, Type } from '@nestjs/common';
import { Options } from '@sentry/types';

export interface SentryModuleOptions extends Options {

    expressTracing?: boolean;

}

export type SentryModuleOptionsFactory = {

    createNestjsSentryModuleOptions(): Promise<SentryModuleOptions> | SentryModuleOptions;

}

export interface SentryModuleAsyncOptions extends Pick<ModuleMetadata, 'imports'> {

    inject?: any[];

    useClass?: Type<SentryModuleOptionsFactory>;

    useExisting?: Type<SentryModuleOptionsFactory>;

    useFactory?: ( ...args: any[] ) => Promise<SentryModuleOptions> | SentryModuleOptions;

}

