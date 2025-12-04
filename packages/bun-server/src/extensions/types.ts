import type { Container } from '../di/container';

/**
 * 应用扩展接口
 */
export interface ApplicationExtension {
  /**
   * 注册扩展
   * @param container - 应用 DI 容器
   */
  register(container: Container): void;
}


