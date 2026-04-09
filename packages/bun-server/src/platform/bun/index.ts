import type { IPlatform } from '../types';
import { bunFsAdapter } from './fs';
import { bunCryptoAdapter } from './crypto';
import { bunParserAdapter } from './parser';
import { bunProcessAdapter } from './process';
import { bunHttpAdapter } from './http';

export function createBunPlatform(): IPlatform {
  return {
    engine: 'bun',
    fs: bunFsAdapter,
    crypto: bunCryptoAdapter,
    parser: bunParserAdapter,
    process: bunProcessAdapter,
    http: bunHttpAdapter,
  };
}
