import { createHmac, createHash } from 'node:crypto';
import type { ICryptoAdapter, IHasher } from '../types';

class NodeHasher implements IHasher {
  private data: Buffer = Buffer.alloc(0);
  private readonly algorithm: string;

  public constructor(algorithm: string) {
    this.algorithm = algorithm;
  }

  public update(data: string | Uint8Array | ArrayBuffer): IHasher {
    if (data instanceof ArrayBuffer) {
      this.data = Buffer.concat([this.data, Buffer.from(data)]);
    } else if (typeof data === 'string') {
      this.data = Buffer.concat([this.data, Buffer.from(data, 'utf-8')]);
    } else {
      this.data = Buffer.concat([this.data, Buffer.from(data)]);
    }
    return this;
  }

  public digest(): Uint8Array;
  public digest(encoding: 'hex' | 'base64' | 'base64url'): string;
  public digest(encoding?: 'hex' | 'base64' | 'base64url'): Uint8Array | string {
    const hash = createHash(this.algorithm);
    hash.update(this.data);
    if (encoding === 'hex') return hash.digest('hex');
    if (encoding === 'base64') return hash.digest('base64');
    if (encoding === 'base64url') return hash.digest('base64url');
    // node:crypto hash.digest() returns Buffer which extends Uint8Array
    return hash.digest();
  }
}

export const nodeCryptoAdapter: ICryptoAdapter = {
  createHasher(algorithm: string): IHasher {
    return new NodeHasher(algorithm);
  },
};
