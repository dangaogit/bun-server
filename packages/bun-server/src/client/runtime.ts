import type { ClientConfig, ClientRequestOptions, RouteManifest } from './types';

/**
 * 将路径中的 :param 占位符替换为实际值
 */
function buildUrl(
  baseUrl: string,
  path: string,
  options?: ClientRequestOptions,
): string {
  let resolvedPath = path;

  if (options?.params) {
    for (const [key, value] of Object.entries(options.params)) {
      resolvedPath = resolvedPath.replace(`:${key}`, encodeURIComponent(value));
    }
  }

  let url = `${baseUrl}${resolvedPath}`;

  if (options?.query) {
    const params = new URLSearchParams(options.query);
    url += `?${params.toString()}`;
  }

  return url;
}

/**
 * 从路由清单创建类型安全的 API 客户端
 *
 * 客户端结构按控制器名称（去除 Controller 后缀，转小写）分组，
 * 每个方法名直接映射为函数调用。
 *
 * 示例：
 * ```
 * const client = createClient(manifest, { baseUrl: 'http://localhost:3000' });
 * const result = await client.user.getUser({ params: { id: '1' } });
 * ```
 */
export function createClient(
  manifest: RouteManifest,
  config: ClientConfig,
): Record<string, Record<string, (options?: ClientRequestOptions) => Promise<unknown>>> {
  const fetchFn = config.fetch ?? globalThis.fetch;
  const groups = new Map<string, Map<string, { method: string; path: string }>>();

  for (const route of manifest.routes) {
    const groupName = route.controllerName
      .replace(/Controller$/i, '')
      .replace(/^./, (c) => c.toLowerCase());

    if (!groups.has(groupName)) {
      groups.set(groupName, new Map());
    }
    groups.get(groupName)!.set(route.methodName, {
      method: route.method,
      path: route.path,
    });
  }

  const client: Record<string, Record<string, (options?: ClientRequestOptions) => Promise<unknown>>> = {};

  for (const [groupName, methods] of groups) {
    const group: Record<string, (options?: ClientRequestOptions) => Promise<unknown>> = {};

    for (const [methodName, routeInfo] of methods) {
      group[methodName] = async (options?: ClientRequestOptions) => {
        const url = buildUrl(config.baseUrl, routeInfo.path, options);

        const fetchOptions: RequestInit = {
          method: routeInfo.method,
          headers: {
            'Content-Type': 'application/json',
            ...(config.headers || {}),
            ...(options?.headers || {}),
          },
        };

        if (options?.body && routeInfo.method !== 'GET') {
          fetchOptions.body = typeof options.body === 'string'
            ? options.body
            : JSON.stringify(options.body);
        }

        const response = await fetchFn(url, fetchOptions);
        const text = await response.text();

        try {
          return JSON.parse(text);
        } catch {
          return text;
        }
      };
    }

    client[groupName] = group;
  }

  return client;
}
