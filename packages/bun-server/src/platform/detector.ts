import type { PlatformEngine } from './types';

/**
 * 解析运行时平台引擎
 * 优先级：bootstrap config > CLI arg (--platform=) > env var (BUN_SERVER_PLATFORM) > auto-detect
 *
 * @param bootstrapConfig - 应用启动时显式指定的平台（最高优先级）
 */
export function resolvePlatform(bootstrapConfig?: PlatformEngine): PlatformEngine {
  if (bootstrapConfig) {
    return bootstrapConfig;
  }

  // CLI arg: --platform=node or --platform=bun
  for (const arg of process.argv) {
    if (arg.startsWith('--platform=')) {
      const value = arg.slice('--platform='.length).trim();
      if (value === 'node' || value === 'bun') {
        return value;
      }
    }
  }

  // Env var: BUN_SERVER_PLATFORM=node or BUN_SERVER_PLATFORM=bun
  const envValue = process.env['BUN_SERVER_PLATFORM'];
  if (envValue === 'node' || envValue === 'bun') {
    return envValue;
  }

  // Auto-detect: check if running inside Bun
  if (typeof Bun !== 'undefined') {
    return 'bun';
  }

  return 'node';
}
