<h1 align="center"></h1>

<div align="center" style="display: flex; align-items:center; justify-content:center">
  <a href="http://nestjs.com/" target="_blank" style="padding-right: 16px">
    <img src="https://nestjs.com/img/logo_text.svg" width="150" alt="Nest Logo" />
  </a>
  <a href="https://sentry.io/" target="_blank">
    <img src="https://raw.githubusercontent.com/mahendradambe/sentry-nestjs/master/.images/sentry-wordmark-dark-400x119.png" width="150" alt="Sentry Logo" />
  </a>
</div>

<h3 align="center">Sentry NestJS</h3>


### Usage

 1. Register Module
```typescript
import { LogLevel } from '@sentry/types'
import { SentryModule } from 'sentry-nestjs'

@Module( {
    imports: [
        SentryModule.forRoot( {
            dsn: '<sentry-dsn>',
            environment: 'dev',
            debug: true,
            logLevel: LogLevel.Debug,
            sampleRate: 1,
            tracesSampleRate: 1,
            expressTracing: true, // use sentry tracing extensions for express
            // rest of the Sentry.Options
        } ),
    ],
    controllers: [ AppController ],
    service: [ AppService ]
} )

```
2. On HTTP Controller
```typescript
import { Span, Transaction } from '@sentry/types'
import { TraceInterceptor, CurrentSpan, CurrentTransaction } from 'sentry-nestjs'

@Controller()
@UseInterceptor( TraceInterceptor ) // use on controller
class AppController {

    constructor(private readonly appService: AppService)

    @Get()
    @UseInterceptor( TraceInterceptor ) // or just on method
    getHello(
        @CurrentSpan() span: CurrentSpan,
        @CurrentTransaction(): transaction: Transaction
    ) {

        return this.appService.getHello()

    }

}

```
3. On any Provider
```typescript
import { InjectSentry, SentryService } from 'sentry-nestjs'

@Injectable()
@Instrument() // use Instrument to trace all methods
class AppService {

    constructor(
        @InjectSentry() sentry: SentryService
    ) {}

    @Trace() // or, use Trace to trace for individual methods
    getHello() {

        this.sentry.currentSpan.setData('data', 'some-data)

        return this.appService.getHello()

    }

}

```
