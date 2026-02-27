/**
 * 路由清单中的单个端点描述
 */
export interface RouteManifestEntry {
  method: string;
  path: string;
  controllerName: string;
  methodName: string;
}

/**
 * 完整的路由清单
 */
export interface RouteManifest {
  routes: RouteManifestEntry[];
}

/**
 * 客户端请求选项
 */
export interface ClientRequestOptions {
  params?: Record<string, string>;
  query?: Record<string, string>;
  body?: unknown;
  headers?: Record<string, string>;
}

/**
 * 客户端配置
 */
export interface ClientConfig {
  baseUrl: string;
  headers?: Record<string, string>;
  /**
   * 自定义 fetch 实现（可选，用于测试）
   */
  fetch?: typeof fetch;
}
