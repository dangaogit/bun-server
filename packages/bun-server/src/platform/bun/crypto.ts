import type { ICryptoAdapter, IHasher } from '../types';

class BunHasher implements IHasher {
  private readonly hasher: Bun.CryptoHasher;

  public constructor(algorithm: string) {
    this.hasher = new Bun.CryptoHasher(algorithm as any);
  }

  public update(data: string | Uint8Array | ArrayBuffer): IHasher {
    this.hasher.update(data as Parameters<Bun.CryptoHasher['update']>[0]);
    return this;
  }

  public digest(): Uint8Array;
  public digest(encoding: 'hex' | 'base64' | 'base64url'): string;
  public digest(encoding?: 'hex' | 'base64' | 'base64url'): Uint8Array | string {
    if (encoding) {
      return this.hasher.digest(encoding) as string;
    }
    // Bun.CryptoHasher.digest() returns Buffer which extends Uint8Array
    return this.hasher.digest() as unknown as Uint8Array;
  }
}

export const bunCryptoAdapter: ICryptoAdapter = {
  createHasher(algorithm: string): IHasher {
    return new BunHasher(algorithm);
  },
};
