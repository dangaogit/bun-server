import { readFile, writeFile, stat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { glob } from 'node:fs/promises';
import { Readable } from 'node:stream';
import { lookup as mimeLookup } from 'mime-types';
import { extname } from 'node:path';
import type { IFsAdapter, IFileRef } from '../types';

class NodeFileRef implements IFileRef {
  private readonly path: string;
  private _type: string | null = null;
  private _size: number | null = null;

  public constructor(path: string) {
    this.path = path;
  }

  public get type(): string {
    if (this._type === null) {
      const ext = extname(this.path).toLowerCase();
      this._type = (mimeLookup(ext) || 'application/octet-stream') as string;
    }
    return this._type;
  }

  public get size(): number {
    return this._size ?? 0;
  }

  public async text(): Promise<string> {
    const buf = await readFile(this.path);
    const stats = await stat(this.path).catch(() => null);
    if (stats) this._size = stats.size;
    return buf.toString('utf-8');
  }

  public async bytes(): Promise<Uint8Array> {
    const buf = await readFile(this.path);
    const stats = await stat(this.path).catch(() => null);
    if (stats) this._size = stats.size;
    return new Uint8Array(buf);
  }

  public async arrayBuffer(): Promise<ArrayBuffer> {
    const bytes = await this.bytes();
    return bytes.buffer as ArrayBuffer;
  }

  public async exists(): Promise<boolean> {
    return stat(this.path)
      .then((s) => { this._size = s.size; return true; })
      .catch(() => false);
  }

  public stream(): ReadableStream<Uint8Array> {
    const nodeStream = createReadStream(this.path);
    // Convert Node.js Readable to Web ReadableStream
    return Readable.toWeb(nodeStream) as ReadableStream<Uint8Array>;
  }
}

export const nodeFsAdapter: IFsAdapter = {
  file(path: string): IFileRef {
    return new NodeFileRef(path);
  },

  async write(path: string, data: string | Uint8Array | ArrayBuffer): Promise<void> {
    if (data instanceof ArrayBuffer) {
      await writeFile(path, Buffer.from(data));
    } else {
      await writeFile(path, data as string | Uint8Array);
    }
  },

  glob(pattern: string, cwd?: string): string[] {
    // Use synchronous glob via fast-glob-compatible approach
    // node:fs/promises glob is async; we use sync approach via readdirSync + pattern matching
    const results: string[] = [];
    const base = cwd ?? '.';
    try {
      const { globSync } = require('node:fs');
      if (globSync) {
        // Node 22.0+ has globSync
        const matches = globSync(pattern, { cwd: base });
        return Array.from(matches as string[]);
      }
    } catch {
      // fallback
    }
    // Manual fallback: read dir and match with minimatch-style
    try {
      const entries = require('node:fs').readdirSync(base, { withFileTypes: true, recursive: true }) as import('node:fs').Dirent[];
      const regex = patternToRegex(pattern);
      for (const entry of entries) {
        if (entry.isFile()) {
          const name = (entry as any).name as string;
          if (regex.test(name)) {
            results.push(name);
          }
        }
      }
    } catch {
      // ignore
    }
    return results;
  },
};

function patternToRegex(pattern: string): RegExp {
  const escaped = pattern
    .replace(/[|\\{}()[\]^$+*?.]/g, '\\$&')
    .replace(/\\\*/g, '[^/]*')
    .replace(/\\\?/g, '[^/]');
  return new RegExp(`^${escaped}$`);
}
