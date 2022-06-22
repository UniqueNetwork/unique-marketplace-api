import { Inject } from '@nestjs/common';
import { UNIQUE_API_PROVIDER, KUSAMA_API_PROVIDER } from './constants';

export const InjectUniqueAPI = () => Inject(UNIQUE_API_PROVIDER);
export const InjectKusamaAPI = () => Inject(KUSAMA_API_PROVIDER);
