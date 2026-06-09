import 'reflect-metadata';
import type {
  ApiBodyMetadata,
  ApiOperationMetadata,
  ApiParamMetadata,
  ApiResponseMetadata,
} from './types';

/**
 * Swagger 元数据键
 */
const API_TAG_METADATA_KEY = Symbol('swagger:api-tag');
const API_OPERATION_METADATA_KEY = Symbol('swagger:api-operation');
const API_PARAM_METADATA_KEY = Symbol('swagger:api-param');
const API_BODY_METADATA_KEY = Symbol('swagger:api-body');
const API_RESPONSE_METADATA_KEY = Symbol('swagger:api-response');

/**
 * API 标签装饰器
 * 用于标记控制器或操作的标签
 * @param metadata - 标签元数据
 */
export function ApiTags(...tags: string[]): ClassDecorator & MethodDecorator {
  return function (target: unknown, propertyKey?: string | symbol) {
    if (propertyKey === undefined) {
      // 类装饰器
      Reflect.defineMetadata(API_TAG_METADATA_KEY, tags, target as Object);
    } else {
      // 方法装饰器
      const existingTags: string[] =
        Reflect.getMetadata(API_TAG_METADATA_KEY, target as Object, propertyKey) || [];
      Reflect.defineMetadata(API_TAG_METADATA_KEY, [...existingTags, ...tags], target as Object, propertyKey);
    }
  };
}

/**
 * API 操作装饰器
 * 用于描述 API 操作
 * @param metadata - 操作元数据
 */
export function ApiOperation(metadata: ApiOperationMetadata): MethodDecorator {
  return function (target: unknown, propertyKey: string | symbol) {
    Reflect.defineMetadata(API_OPERATION_METADATA_KEY, metadata, target as Object, propertyKey);
  };
}

/**
 * API 参数装饰器
 * 用于描述 API 参数
 * @param metadata - 参数元数据
 */
export function ApiParam(metadata: ApiParamMetadata): ParameterDecorator & MethodDecorator {
  const decorator = (
    target: Object,
    propertyKey: string | symbol | undefined,
    descriptorOrParameterIndex: TypedPropertyDescriptor<any> | number,
  ): void => {
    const paramMetadata: ApiParamMetadata = {
      in: 'path',
      ...metadata,
    };
    const existingParams: Array<{ index: number; metadata: ApiParamMetadata }> =
      Reflect.getMetadata(API_PARAM_METADATA_KEY, target as Object, propertyKey!) || [];
    const index = typeof descriptorOrParameterIndex === 'number'
      ? descriptorOrParameterIndex
      : -1;
    existingParams.push({ index, metadata: paramMetadata });
    Reflect.defineMetadata(API_PARAM_METADATA_KEY, existingParams, target as Object, propertyKey!);
  };
  return decorator as ParameterDecorator & MethodDecorator;
}

/**
 * API 请求体装饰器
 * 用于描述请求体
 * @param metadata - 请求体元数据
 */
export function ApiBody(metadata: ApiBodyMetadata): MethodDecorator {
  return function (target: unknown, propertyKey: string | symbol) {
    Reflect.defineMetadata(API_BODY_METADATA_KEY, metadata, target as Object, propertyKey);
  };
}

/**
 * API 响应装饰器
 * 用于描述 API 响应
 * @param metadata - 响应元数据
 */
export function ApiResponse(metadata: ApiResponseMetadata): MethodDecorator {
  return function (target: unknown, propertyKey: string | symbol) {
    const existingResponses: ApiResponseMetadata[] =
      Reflect.getMetadata(API_RESPONSE_METADATA_KEY, target as Object, propertyKey) || [];
    existingResponses.push(metadata);
    Reflect.defineMetadata(API_RESPONSE_METADATA_KEY, existingResponses, target as Object, propertyKey);
  };
}

/**
 * 获取 API 标签
 */
export function getApiTags(target: unknown, propertyKey?: string | symbol): string[] {
  if (propertyKey === undefined) {
    return Reflect.getMetadata(API_TAG_METADATA_KEY, target as Object) || [];
  }
  return Reflect.getMetadata(API_TAG_METADATA_KEY, target as Object, propertyKey) || [];
}

/**
 * 获取 API 操作元数据
 */
export function getApiOperation(
  target: unknown,
  propertyKey: string | symbol,
): ApiOperationMetadata | undefined {
  return Reflect.getMetadata(API_OPERATION_METADATA_KEY, target as Object, propertyKey);
}

/**
 * 获取 API 参数元数据
 */
export function getApiParams(
  target: unknown,
  propertyKey: string | symbol,
): Array<{ index: number; metadata: ApiParamMetadata }> {
  return Reflect.getMetadata(API_PARAM_METADATA_KEY, target as Object, propertyKey) || [];
}

/**
 * 获取 API 请求体元数据
 */
export function getApiBody(target: unknown, propertyKey: string | symbol): ApiBodyMetadata | undefined {
  return Reflect.getMetadata(API_BODY_METADATA_KEY, target as Object, propertyKey);
}

/**
 * 获取 API 响应元数据
 */
export function getApiResponses(
  target: unknown,
  propertyKey: string | symbol,
): ApiResponseMetadata[] {
  return Reflect.getMetadata(API_RESPONSE_METADATA_KEY, target as Object, propertyKey) || [];
}
