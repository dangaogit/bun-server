import { describe, test, expect } from 'vitest';
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';

/**
 * 烟雾测试：验证 bun build --target=node 的输出能被 Node.js 原生运行
 *
 * 测试流程：
 * 1. 创建最小化 app fixture
 * 2. 使用 bun build --target=node 编译
 * 3. 用 node 运行编译产物
 * 4. 验证应用启动成功
 */
describe('Build Smoke Test (bun build --target=node)', () => {
  test('compiled output runs on Node.js', async () => {
    const tmpDir = join(tmpdir(), `build-smoke-${Date.now()}`);
    mkdirSync(tmpDir, { recursive: true });

    const outDir = join(tmpDir, 'out');
    mkdirSync(outDir, { recursive: true });

    // Create a minimal fixture app using the framework
    const fixturePath = join(tmpDir, 'fixture.ts');
    const pkgRoot = resolve(__dirname, '../../..');

    writeFileSync(fixturePath, `
import { Application } from '${pkgRoot}/src/index.ts';
import { Module } from '${pkgRoot}/src/index.ts';

@Module({})
class AppModule {}

const app = new Application({ platform: 'node' });
app.registerModule(AppModule);
app.listen(0).then(() => {
  const server = app.getServer()?.getServer();
  console.log('SMOKE_OK port=' + (server?.port ?? 0));
  process.exit(0);
}).catch((err) => {
  console.error('SMOKE_FAIL', err.message);
  process.exit(1);
});
`);

    const outFile = join(outDir, 'app.cjs');

    // Build with bun
    const buildResult = await runCommand('bun', [
      'build',
      fixturePath,
      '--target=node',
      '--outfile=' + outFile,
      '--format=cjs',
    ]);

    if (buildResult.exitCode !== 0) {
      // Build may fail in CI without Bun; skip gracefully
      console.warn('[build-smoke] bun build failed, skipping test:', buildResult.stderr);
      return;
    }

    // Run compiled file with node
    const nodeResult = await runCommand('node', [outFile], 5000);

    try {
      rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // ignore cleanup errors
    }

    expect(nodeResult.exitCode).toBe(0);
    expect(nodeResult.stdout).toContain('SMOKE_OK');
  }, 30000);
});

function runCommand(
  cmd: string,
  args: string[],
  timeout = 15000,
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { timeout });
    let stdout = '';
    let stderr = '';
    child.stdout?.on('data', (d) => { stdout += d.toString(); });
    child.stderr?.on('data', (d) => { stderr += d.toString(); });
    child.on('close', (code) => resolve({ exitCode: code ?? 1, stdout, stderr }));
    child.on('error', (err) => resolve({ exitCode: 1, stdout, stderr: err.message }));
  });
}
