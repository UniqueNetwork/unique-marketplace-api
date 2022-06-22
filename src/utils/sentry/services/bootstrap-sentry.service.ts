import { Inject, Injectable, OnApplicationShutdown } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import * as Sentry from '@sentry/node';
import * as Tracing from '@sentry/tracing';
import { Integration } from '@sentry/types';
import { SENTRY_MODULE_OPTIONS } from '../constants';
import { SentryModuleOptions } from '../interfaces';

@Injectable()
export class BootstrapSentry implements OnApplicationShutdown {
  constructor(
    private readonly adapterHost: HttpAdapterHost,
    @Inject(SENTRY_MODULE_OPTIONS)
    private readonly options: SentryModuleOptions,
    @Inject('CONFIG')
    private readonly config,
  ) {
    const { integrations, ...restOptions } = options;

    const sentryIntegrations: Integration[] = [new Sentry.Integrations.Http({ tracing: true }), new Tracing.Integrations.Postgres()];

    const initIntegrations = integrations
      ? typeof integrations === 'function'
        ? () => sentryIntegrations.concat(integrations([]))
        : sentryIntegrations.concat(integrations)
      : sentryIntegrations;

    Sentry.init({
      ...restOptions,
      integrations: initIntegrations,
      enabled: this.config.sentry.enabled,
      dsn: this.config.sentry.enabled ? this.config.sentry.dsn : null,
    });
  }

  async onApplicationShutdown() {
    await Sentry.close();
  }
}
