import type { IFsAdapter, IFileRef } from '../types';

class BunFileRef implements IFileRef {
  private readonly bunFile: ReturnType<typeof Bun.file>;

  public constructor(bunFile: ReturnType<typeof Bun.file>) {
    this.bunFile = bunFile;
  }

  public get type(): string {
    return this.bunFile.type;
  }

  public get size(): number {
    return this.bunFile.size;
  }

  public text(): Promise<string> {
    return this.bunFile.text();
  }

  public bytes(): Promise<Uint8Array> {
    return this.bunFile.bytes();
  }

  public arrayBuffer(): Promise<ArrayBuffer> {
    return this.bunFile.arrayBuffer();
  }

  public exists(): Promise<boolean> {
    return this.bunFile.exists();
  }

  public stream(): ReadableStream<Uint8Array> {
    return this.bunFile.stream() as ReadableStream<Uint8Array>;
  }
}

export const bunFsAdapter: IFsAdapter = {
  file(path: string): IFileRef {
    return new BunFileRef(Bun.file(path));
  },

  async write(path: string, data: string | Uint8Array | ArrayBuffer): Promise<void> {
    await Bun.write(path, data as any);
  },

  glob(pattern: string, cwd?: string): string[] {
    const g = new Bun.Glob(pattern);
    return Array.from(g.scanSync(cwd ?? '.'));
  },
};
