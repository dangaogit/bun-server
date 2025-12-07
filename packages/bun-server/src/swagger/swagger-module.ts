import { Module, MODULE_METADATA_KEY } from '../di/module';
import { SwaggerExtension } from './swagger-extension';
import { createSwaggerUIMiddleware } from './ui';
import type { SwaggerOptions } from './types';

/**
 * Swagger 模块配置
 */
export interface SwaggerModuleOptions extends SwaggerOptions {
  /**
   * Swagger UI 路径
   * @default '/swagger'
   */
  uiPath?: string;
  /**
   * Swagger JSON 路径
   * @default '/swagger.json'
   */
  jsonPath?: string;
  /**
   * Swagger UI 标题
   */
  uiTitle?: string;
  /**
   * 是否启用 Swagger UI
   * @default true
   */
  enableUI?: boolean;
}

/**
 * Swagger 模块
 * 提供 API 文档生成和 Swagger UI
 */
@Module({
  extensions: [
    // 将在运行时根据配置创建
  ],
  middlewares: [
    // 将在运行时根据配置创建
  ],
})
export class SwaggerModule {
  /**
   * 创建 Swagger 模块
   * @param options - 模块配置
   */
  public static forRoot(options: SwaggerModuleOptions): typeof SwaggerModule {
    const extensions: any[] = [];
    const middlewares: any[] = [];

    // 创建 Swagger 扩展
    const swaggerExtension = new SwaggerExtension({
      info: options.info,
      servers: options.servers,
      basePath: options.basePath,
      tags: options.tags,
    });
    extensions.push(swaggerExtension);

    // 如果启用 UI，添加中间件
    if (options.enableUI !== false) {
      const uiMiddleware = createSwaggerUIMiddleware(swaggerExtension, {
        uiPath: options.uiPath || '/swagger',
        jsonPath: options.jsonPath || '/swagger.json',
        title: options.uiTitle || options.info.title || 'API Documentation',
      });
      middlewares.push(uiMiddleware);
    }

    // 动态更新模块元数据
    const existingMetadata = Reflect.getMetadata(MODULE_METADATA_KEY, SwaggerModule) || {};
    const metadata = {
      ...existingMetadata,
      extensions,
      middlewares,
    };
    Reflect.defineMetadata(MODULE_METADATA_KEY, metadata, SwaggerModule);

    return SwaggerModule;
  }
}

