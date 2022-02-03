import { Inject } from '@nestjs/common';
import { SENTRY } from '../constants';

export const InjectSentry = () => Inject(SENTRY);
