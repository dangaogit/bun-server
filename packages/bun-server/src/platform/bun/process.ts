import type { IProcessAdapter, IChildProcess, SpawnOptions } from '../types';

class BunChildProcess implements IChildProcess {
  private readonly child: ReturnType<typeof Bun.spawn>;

  public constructor(child: ReturnType<typeof Bun.spawn>) {
    this.child = child;
  }

  public get pid(): number {
    return this.child.pid;
  }

  public get exited(): Promise<number | null> {
    return this.child.exited;
  }

  public kill(signal?: string | number): void {
    this.child.kill(signal as Parameters<ReturnType<typeof Bun.spawn>['kill']>[0]);
  }
}

export const bunProcessAdapter: IProcessAdapter = {
  spawn(options: SpawnOptions): IChildProcess {
    const child = Bun.spawn({
      cmd: options.cmd,
      env: options.env as Record<string, string>,
      stdout: options.stdout ?? 'inherit',
      stderr: options.stderr ?? 'inherit',
    });
    return new BunChildProcess(child);
  },

  async sleep(ms: number): Promise<void> {
    await Bun.sleep(ms);
  },
};
