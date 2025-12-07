import type { SwaggerDocument, SwaggerOptions, SwaggerPathItem } from './types';
import { ControllerRegistry } from '../controller/controller';
import { getControllerMetadata, getRouteMetadata } from '../controller/metadata';
import {
  getApiTags,
  getApiOperation,
  getApiParams,
  getApiBody,
  getApiResponses,
} from './decorators';

/**
 * Swagger 文档生成器
 */
export class SwaggerGenerator {
  private readonly options: SwaggerOptions;

  public constructor(options: SwaggerOptions) {
    this.options = options;
  }

  /**
   * 生成 Swagger 文档
   */
  public generate(): SwaggerDocument {
    const document: SwaggerDocument = {
      openapi: '3.0.0',
      info: {
        title: this.options.info.title,
        version: this.options.info.version,
        description: this.options.info.description,
        contact: this.options.info.contact,
        license: this.options.info.license,
      },
      servers: this.options.servers,
      tags: this.options.tags,
      paths: {},
    };

    // 从 ControllerRegistry 获取所有控制器
    const controllerRegistry = ControllerRegistry.getInstance();
    const controllers = controllerRegistry.getRegisteredControllers();

    if (controllers.length === 0) {
      return document;
    }

    for (const controllerClass of controllers) {
      const controllerMetadata = getControllerMetadata(controllerClass);
      if (!controllerMetadata) {
        console.log(`[SwaggerGenerator] No metadata for controller: ${controllerClass.name}`);
        continue;
      }

      const basePath = controllerMetadata.path;
      const prototype = controllerClass.prototype;
      
      // 获取路由元数据 - 从原型获取
      const routes = getRouteMetadata(prototype);

      // 如果没有路由，跳过这个控制器
      if (!routes || routes.length === 0) {
        continue;
      }

      // 获取控制器级别的标签
      const controllerTags = getApiTags(controllerClass);

      for (const route of routes) {
        // 如果没有 propertyKey，尝试从 handler 函数名或原型中查找
        let propertyKey = route.propertyKey;
        if (!propertyKey && route.handler) {
          // 尝试从 handler 函数名获取
          propertyKey = route.handler.name;
          // 如果还是没有，从原型中查找
          if (!propertyKey || propertyKey === '') {
            const propertyNames = Object.getOwnPropertyNames(prototype);
            for (const key of propertyNames) {
              if (key === 'constructor') continue;
              const descriptor = Object.getOwnPropertyDescriptor(prototype, key);
              if (descriptor && descriptor.value === route.handler) {
                propertyKey = key;
                break;
              }
            }
          }
        }
        
        if (!propertyKey) {
          continue;
        }

        const method = route.method.toLowerCase() as 'get' | 'post' | 'put' | 'delete' | 'patch';
        // 组合基础路径和方法路径
        let methodPath = route.path;
        // 如果方法路径不是以 / 开头，需要添加
        if (methodPath && !methodPath.startsWith('/')) {
          methodPath = '/' + methodPath;
        }
        // 将路径参数格式从 :param 转换为 {param}（OpenAPI 格式）
        const swaggerPath = (basePath + methodPath).replace(/:([^/]+)/g, '{$1}');
        const fullPath = this.normalizePath(swaggerPath);

        // 获取方法级别的元数据
        const operationMetadata = getApiOperation(prototype, propertyKey);
        const methodTags = getApiTags(prototype, propertyKey);
        const params = getApiParams(prototype, propertyKey);
        const body = getApiBody(prototype, propertyKey);
        const responses = getApiResponses(prototype, propertyKey);

        // 合并标签
        const tags = [...new Set([...controllerTags, ...methodTags])];

        const pathItem: SwaggerPathItem = {
          summary: operationMetadata?.summary,
          description: operationMetadata?.description,
          operationId: operationMetadata?.operationId || propertyKey,
          tags: tags.length > 0 ? tags : undefined,
          deprecated: operationMetadata?.deprecated,
        };

        // 处理参数
        const pathParams: Array<{
          name: string;
          in: 'query' | 'path' | 'header' | 'cookie';
          description?: string;
          required?: boolean;
          schema?: {
            type?: string;
            format?: string;
            enum?: unknown[];
            default?: unknown;
          };
        }> = [];

        // 自动从路径中提取路径参数
        const pathParamMatches = fullPath.matchAll(/\{([^}]+)\}/g);
        for (const match of pathParamMatches) {
          const paramName = match[1];
          // 检查是否已经有手动定义的参数
          const existingParam = params.find((p) => p.metadata.name === paramName && p.metadata.in === 'path');
          if (!existingParam) {
            // 自动添加路径参数
            pathParams.push({
              name: paramName,
              in: 'path',
              required: true,
              schema: { type: 'string' },
            });
          }
        }

        // 添加手动定义的参数
        for (const param of params) {
          pathParams.push({
            name: param.metadata.name,
            in: param.metadata.in,
            description: param.metadata.description,
            required: param.metadata.required,
            schema: param.metadata.schema,
          });
        }

        if (pathParams.length > 0) {
          pathItem.parameters = pathParams;
        }

        // 处理请求体
        if (body) {
          pathItem.requestBody = {
            description: body.description,
            required: body.required,
            content: {
              'application/json': {
                schema: body.schema,
                examples: body.examples,
              },
            },
          };
        }

        // 处理响应
        if (responses.length > 0) {
          pathItem.responses = {};
          for (const response of responses) {
            pathItem.responses[String(response.status)] = {
              description: response.description,
              content: {
                'application/json': {
                  schema: response.schema,
                  examples: response.examples,
                },
              },
            };
          }
        } else {
          // 默认响应
          pathItem.responses = {
            '200': {
              description: 'Success',
            },
          };
        }

        // 初始化路径对象
        if (!document.paths[fullPath]) {
          document.paths[fullPath] = {};
        }

        document.paths[fullPath][method] = pathItem;
      }
    }

    return document;
  }

  /**
   * 规范化路径
   */
  private normalizePath(path: string): string {
    // 移除重复的斜杠
    path = path.replace(/\/+/g, '/');
    // 确保以 / 开头
    if (!path.startsWith('/')) {
      path = '/' + path;
    }
    // 移除末尾的斜杠（除非是根路径）
    if (path.length > 1 && path.endsWith('/')) {
      path = path.slice(0, -1);
    }
    return path;
  }
}

