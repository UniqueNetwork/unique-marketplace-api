import { Inject, Injectable, OnApplicationShutdown } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import * as Sentry from '@sentry/node';
import * as Tracing from '@sentry/tracing';
import { Integration, Options } from '@sentry/types';
import { SENTRY_MODULE_OPTIONS } from '../constants';
import { SentryModuleOptions } from '../interfaces';

@Injectable()
export class BootstrapSentry implements OnApplicationShutdown {
  constructor(
    private readonly adapterHost: HttpAdapterHost,
    @Inject(SENTRY_MODULE_OPTIONS)
    private readonly options: SentryModuleOptions,
    @Inject('CONFIG')
    private readonly config
  ) {
    const { expressTracing, integrations, ...restOptions } = options;
    let _integrations: Options['integrations'];

    const SentryIntegrations: Integration[] = [new Sentry.Integrations.Http({ tracing: true }), new Tracing.Integrations.Postgres()];

    _integrations = integrations
      ? typeof integrations === 'function'
        ? () => SentryIntegrations.concat(integrations([]))
        : SentryIntegrations.concat(integrations)
      : SentryIntegrations;

    Sentry.init({
      ...restOptions,
      integrations: _integrations,
      enabled: this.config.sentry.enabled,
      dsn: this.config.sentry.enabled ? this.config.sentry.dsn : null
    });
  }

  async onApplicationShutdown() {
    await Sentry.close();
  }
}
