import { Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TraceOptions } from '../interfaces';
import { SENTRY_INSTRUMENT_PROVIDER, SENTRY_TRACE } from '../constants/instrument.tokens';

@Injectable()
export class InstrumentMetadataAccessor {
  constructor(private readonly reflector: Reflector) {}

  isInstrumentProvider(target: Function) {
    if (!target) {
      return false;
    }

    return this.reflector.get(SENTRY_INSTRUMENT_PROVIDER, target);
  }

  isTraceMethod(target: Function) {
    if (!target) {
      return false;
    }

    return this.reflector.get(SENTRY_TRACE, target);
  }

  getInstrumentName(target: Function) {
    return this.reflector.get(SENTRY_INSTRUMENT_PROVIDER, target);
  }

  getTraceMetadata(target: Function) {
    return this.reflector.get<TraceOptions>(SENTRY_TRACE, target);
  }
}
