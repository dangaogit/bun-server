import { spawn as nodeSpawn } from 'node:child_process';
import type { IProcessAdapter, IChildProcess, SpawnOptions } from '../types';

class NodeChildProcess implements IChildProcess {
  private readonly child: ReturnType<typeof nodeSpawn>;
  private readonly _exited: Promise<number | null>;

  public constructor(child: ReturnType<typeof nodeSpawn>) {
    this.child = child;
    this._exited = new Promise<number | null>((resolve) => {
      child.on('exit', (code) => resolve(code));
    });
  }

  public get pid(): number {
    return this.child.pid ?? -1;
  }

  public get exited(): Promise<number | null> {
    return this._exited;
  }

  public kill(signal?: string | number): void {
    if (typeof signal === 'string') {
      this.child.kill(signal as NodeJS.Signals);
    } else if (typeof signal === 'number') {
      this.child.kill(signal);
    } else {
      this.child.kill('SIGTERM');
    }
  }
}

export const nodeProcessAdapter: IProcessAdapter = {
  spawn(options: SpawnOptions): IChildProcess {
    const [cmd, ...args] = options.cmd;
    const child = nodeSpawn(cmd!, args, {
      env: (options.env ?? process.env) as Record<string, string>,
      stdio: [
        'ignore',
        options.stdout === 'pipe' ? 'pipe' : options.stdout === 'ignore' ? 'ignore' : 'inherit',
        options.stderr === 'pipe' ? 'pipe' : options.stderr === 'ignore' ? 'ignore' : 'inherit',
      ],
    });
    return new NodeChildProcess(child);
  },

  async sleep(ms: number): Promise<void> {
    await new Promise<void>((resolve) => setTimeout(resolve, ms));
  },
};
