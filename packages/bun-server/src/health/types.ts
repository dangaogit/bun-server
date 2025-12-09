export const HEALTH_INDICATORS_TOKEN = Symbol('@dangao/bun-server:health:indicators');
export const HEALTH_OPTIONS_TOKEN = Symbol('@dangao/bun-server:health:options');

export type HealthStatusValue = 'up' | 'down';

export interface HealthIndicatorResult {
  status: HealthStatusValue;
  details?: Record<string, unknown>;
}

export interface HealthIndicator {
  name: string;
  check(): Promise<HealthIndicatorResult> | HealthIndicatorResult;
}

export interface HealthStatus {
  status: HealthStatusValue;
  details: Record<string, HealthIndicatorResult>;
}

export interface HealthModuleOptions {
  /**
   * 健康检查指示器列表
   */
  indicators?: HealthIndicator[];
}


