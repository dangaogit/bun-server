import type { IPlatform, PlatformEngine } from './types';
import { resolvePlatform } from './detector';

let _runtime: IPlatform | null = null;

/**
 * 初始化全局运行时平台
 * 应在 Application 构造函数中最先调用
 *
 * @param engine - 显式指定平台（优先级最高），省略则走优先级检测链
 */
export function initRuntime(engine?: PlatformEngine): void {
  const resolved = resolvePlatform(engine);

  if (_runtime && _runtime.engine === resolved) {
    return;
  }

  if (resolved === 'bun') {
    // 动态导入避免 Node.js 环境下引入 Bun 专属 API
    const { createBunPlatform } = require('./bun/index');
    _runtime = createBunPlatform();
  } else {
    const { createNodePlatform } = require('./node/index');
    _runtime = createNodePlatform();
  }
}

/**
 * 获取当前已初始化的平台运行时
 * 必须在 initRuntime() 调用之后使用
 */
export function getRuntime(): IPlatform {
  if (!_runtime) {
    throw new Error(
      '[Platform] Runtime not initialized. ' +
      'Make sure initRuntime() is called before using getRuntime(). ' +
      'This is automatically done by new Application(options).',
    );
  }
  return _runtime;
}

/**
 * 重置运行时（仅用于测试）
 * @internal
 */
export function _resetRuntime(): void {
  _runtime = null;
}
