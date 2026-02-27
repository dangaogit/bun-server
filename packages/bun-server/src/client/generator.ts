import { RouteRegistry } from '../router/registry';
import type { RouteManifest, RouteManifestEntry } from './types';

/**
 * 客户端清单生成器
 * 从 RouteRegistry 提取路由元数据，生成路由清单
 */
export class ClientGenerator {
  /**
   * 从当前 RouteRegistry 生成路由清单
   */
  public static generate(): RouteManifest {
    const registry = RouteRegistry.getInstance();
    const router = registry.getRouter();
    const routes = router.getRoutes();
    const entries: RouteManifestEntry[] = [];

    for (const route of routes) {
      entries.push({
        method: route.method,
        path: route.path,
        controllerName: route.controllerClass?.name ?? 'unknown',
        methodName: route.methodName ?? 'unknown',
      });
    }

    return { routes: entries };
  }

  /**
   * 生成清单的 JSON 字符串
   */
  public static generateJSON(): string {
    return JSON.stringify(ClientGenerator.generate(), null, 2);
  }
}
