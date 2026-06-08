/**
 * Swagger/OpenAPI 类型定义
 */

/**
 * Swagger 信息配置
 */
export interface SwaggerInfo {
  title: string;
  version: string;
  description?: string;
  contact?: {
    name?: string;
    email?: string;
    url?: string;
  };
  license?: {
    name: string;
    url?: string;
  };
}

/**
 * Swagger 配置
 */
export interface SwaggerOptions {
  info: SwaggerInfo;
  servers?: Array<{
    url: string;
    description?: string;
  }>;
  basePath?: string;
  tags?: Array<{
    name: string;
    description?: string;
  }>;
}

/**
 * API 操作元数据
 */
export interface ApiOperationMetadata {
  summary?: string;
  description?: string;
  operationId?: string;
  tags?: string[];
  deprecated?: boolean;
}

/**
 * API 参数元数据
 */
export interface ApiParamMetadata {
  name: string;
  description?: string;
  required?: boolean;
  schema?: {
    type?: string;
    format?: string;
    enum?: unknown[];
    default?: unknown;
  };
  in?: 'query' | 'path' | 'header' | 'cookie';
}

/**
 * API 请求体元数据
 */
export interface ApiBodyMetadata {
  description?: string;
  required?: boolean;
  schema?: {
    type?: string;
    properties?: Record<string, unknown>;
    required?: string[];
  };
  examples?: Record<string, unknown>;
}

/**
 * API 响应元数据
 */
export interface ApiResponseMetadata {
  status: number;
  description?: string;
  schema?: {
    type?: string;
    properties?: Record<string, unknown>;
  };
  examples?: Record<string, unknown>;
}

/**
 * API 标签元数据
 */
export interface ApiTagMetadata {
  name: string;
  description?: string;
}

/**
 * Swagger 路径项
 */
export interface SwaggerPathItem {
  summary?: string;
  description?: string;
  operationId?: string;
  tags?: string[];
  parameters?: Array<{
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
  }>;
  requestBody?: {
    description?: string;
    required?: boolean;
    content?: {
      'application/json'?: {
        schema?: {
          type?: string;
          properties?: Record<string, unknown>;
          required?: string[];
        };
        examples?: Record<string, unknown>;
      };
    };
  };
  responses?: Record<
    string,
    {
      description?: string;
      content?: {
        'application/json'?: {
          schema?: {
            type?: string;
            properties?: Record<string, unknown>;
          };
          examples?: Record<string, unknown>;
        };
      };
    }
  >;
  deprecated?: boolean;
}

/**
 * Swagger 文档结构
 */
export interface SwaggerDocument {
  openapi: string;
  info: {
    title: string;
    version: string;
    description?: string;
    contact?: {
      name?: string;
      email?: string;
      url?: string;
    };
    license?: {
      name: string;
      url?: string;
    };
  };
  servers?: Array<{
    url: string;
    description?: string;
  }>;
  tags?: Array<{
    name: string;
    description?: string;
  }>;
  paths: Record<string, {
    get?: SwaggerPathItem;
    post?: SwaggerPathItem;
    put?: SwaggerPathItem;
    delete?: SwaggerPathItem;
    patch?: SwaggerPathItem;
  }>;
}
