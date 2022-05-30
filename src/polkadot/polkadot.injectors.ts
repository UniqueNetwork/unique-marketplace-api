import { Inject } from '@nestjs/common';
import { UNIQUE_API_PROVIDER_TOKEN } from './constants';

export const InjectUniqueAPI = () => {
  return Inject(UNIQUE_API_PROVIDER_TOKEN);
};
