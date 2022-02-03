import { SetMetadata } from '@nestjs/common';
import { SENTRY_INSTRUMENT_PROVIDER } from '../constants/instrument.tokens';

export const Instrument = (name?: string): ClassDecorator => {
  return (target) => {
    SetMetadata(SENTRY_INSTRUMENT_PROVIDER, name ?? target.name)(target);
  };
};
