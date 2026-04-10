import type { IPlatform } from '../types';
import { nodeFsAdapter } from './fs';
import { nodeCryptoAdapter } from './crypto';
import { nodeParserAdapter } from './parser';
import { nodeProcessAdapter } from './process';
import { nodeHttpAdapter } from './http';

export function createNodePlatform(): IPlatform {
  return {
    engine: 'node',
    fs: nodeFsAdapter,
    crypto: nodeCryptoAdapter,
    parser: nodeParserAdapter,
    process: nodeProcessAdapter,
    http: nodeHttpAdapter,
  };
}
