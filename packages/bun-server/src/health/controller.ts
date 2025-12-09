import { Controller } from '../controller';
import { GET } from '../router/decorators';
import { Inject } from '../di/decorators';

import type {
  HealthIndicator,
  HealthIndicatorResult,
  HealthStatus,
} from './types';
import type { HealthModuleOptions } from './types';
import { HEALTH_INDICATORS_TOKEN, HEALTH_OPTIONS_TOKEN } from './types';

/**
 * 健康检查控制器
 *
 * 提供 `/health` 和 `/ready` 两个端点：
 * - /health：存活检查（liveness）
 * - /ready：就绪检查（readiness）
 */
@Controller('/')
export class HealthController {
  public constructor(
    @Inject(HEALTH_INDICATORS_TOKEN)
    private readonly indicators: HealthIndicator[] = [],
    @Inject(HEALTH_OPTIONS_TOKEN)
    private readonly options?: HealthModuleOptions,
  ) {}

  /**
   * 存活检查
   */
  @GET('/health')
  public async health(): Promise<HealthStatus> {
    return await this.checkIndicators();
  }

  /**
   * 就绪检查
   */
  @GET('/ready')
  public async ready(): Promise<HealthStatus> {
    return await this.checkIndicators();
  }

  /**
   * 执行所有健康检查指示器
   */
  private async checkIndicators(): Promise<HealthStatus> {
    const details: Record<string, HealthIndicatorResult> = {};

    for (const indicator of this.indicators || []) {
      try {
        const result = await indicator.check();
        details[indicator.name] = result;
      } catch (error) {
        details[indicator.name] = {
          status: 'down',
          details: {
            error: (error as Error).message,
          },
        };
      }
    }

    const allUp =
      Object.keys(details).length === 0 ||
      Object.values(details).every((result) => result.status === 'up');

    return {
      status: allUp ? 'up' : 'down',
      details,
    };
  }
}


