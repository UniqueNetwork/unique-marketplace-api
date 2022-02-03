import { SentryModule } from './sentry.module';
import { ConfigModule } from '../../config/module';
import { getConfig } from '../../config';
import { LogLevel } from '@sentry/types';

/**
 *  If you wish to use Sentry please follow the instructions in the README.md
 *  Do not forget to specify SENTRY_DSN in the environment
 * @constructor
 */

export const SentryLoggerService = () => {
  const config = getConfig();
  if (config.sentry.enabled) {
    return SentryModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (config = getConfig()) => ({
        dsn: config.sentry.dsn,
        debug: config.sentry.debug,
        environment: config.sentry.environment, // | 'production' | 'some_environment',
        release: config.sentry.release, // must create a release in sentry.io dashboard
        logLevel: LogLevel.Debug,
        sampleRate: 1,
        tracesSampleRate: 1.0,
        close: {
          enabled: true,
          // Time in milliseconds to forcefully quit the application
          timeout: 2000,
        },
      }),
    });
  } else {
    return SentryModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async () => ({}),
    });
  }
};
