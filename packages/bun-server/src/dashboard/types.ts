export interface DashboardModuleOptions {
  /**
   * Dashboard UI 路径
   * @default '/_dashboard'
   */
  path?: string;
  /**
   * Basic Auth 认证配置
   */
  auth?: {
    username: string;
    password: string;
  };
}

export const DASHBOARD_OPTIONS_TOKEN = Symbol('@dangao/bun-server:dashboard:options');
