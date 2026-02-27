import type { ApplicationExtension } from '../extensions/types';
import type { Container } from '../di/container';
import { DashboardService } from './controller';

/**
 * Dashboard 扩展
 * 在应用初始化时注册 Dashboard 路由
 */
export class DashboardExtension implements ApplicationExtension {
  private readonly service: DashboardService;

  /**
   * 创建 Dashboard 扩展
   * @param service - Dashboard 服务实例
   */
  public constructor(service: DashboardService) {
    this.service = service;
  }

  /**
   * 注册扩展，将 Dashboard 路由注册到 RouteRegistry
   */
  public register(_container: Container): void {
    this.service.registerRoutes();
  }
}
