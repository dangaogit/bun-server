export interface DebugModuleOptions {
  /**
   * 是否启用调试功能
   * @default true
   */
  enabled?: boolean;
  /**
   * 最大录制请求数（环形缓冲区）
   * @default 500
   */
  maxRecords?: number;
  /**
   * 是否录制请求体
   * @default true
   */
  recordBody?: boolean;
  /**
   * Debug UI 路径
   * @default '/_debug'
   */
  path?: string;
}

export interface RequestRecord {
  id: string;
  timestamp: number;
  request: {
    method: string;
    path: string;
    headers: Record<string, string>;
    body?: unknown;
  };
  response: {
    status: number;
    headers: Record<string, string>;
    bodySize: number;
  };
  timing: {
    total: number;
  };
  metadata: {
    matchedRoute?: string;
    controller?: string;
    methodName?: string;
  };
}

export const DEBUG_OPTIONS_TOKEN = Symbol('@dangao/bun-server:debug:options');
export const DEBUG_RECORDER_TOKEN = Symbol('@dangao/bun-server:debug:recorder');
