import { describe, expect, test, beforeEach } from 'bun:test';

import {
  TraceIdRequestInterceptor,
  UserInfoRequestInterceptor,
  RequestLogInterceptor,
  ResponseLogInterceptor,
  ResponseTransformInterceptor,
  ErrorHandlerInterceptor,
} from '../../src/microservice/service-client/interceptors';
import type { ServiceCallOptions, ServiceCallResponse, ServiceInstance } from '../../src/microservice/service-client/types';

describe('TraceIdRequestInterceptor', () => {
  test('should add trace id header with default name', () => {
    const interceptor = new TraceIdRequestInterceptor();
    const options: ServiceCallOptions = {
      serviceName: 'test-service',
      path: '/api/test',
      method: 'GET',
    };

    const result = interceptor.intercept(options);

    expect(result.headers?.['X-Trace-Id']).toBeDefined();
    expect(typeof result.headers?.['X-Trace-Id']).toBe('string');
  });

  test('should use custom header name', () => {
    const interceptor = new TraceIdRequestInterceptor({
      headerName: 'X-Request-Id',
    });
    const options: ServiceCallOptions = {
      serviceName: 'test-service',
      path: '/api/test',
      method: 'GET',
    };

    const result = interceptor.intercept(options);

    expect(result.headers?.['X-Request-Id']).toBeDefined();
    expect(result.headers?.['X-Trace-Id']).toBeUndefined();
  });

  test('should use custom trace id generator', () => {
    const interceptor = new TraceIdRequestInterceptor({
      traceIdGenerator: () => 'custom-trace-123',
    });
    const options: ServiceCallOptions = {
      serviceName: 'test-service',
      path: '/api/test',
      method: 'GET',
    };

    const result = interceptor.intercept(options);

    expect(result.headers?.['X-Trace-Id']).toBe('custom-trace-123');
  });

  test('should preserve existing headers', () => {
    const interceptor = new TraceIdRequestInterceptor();
    const options: ServiceCallOptions = {
      serviceName: 'test-service',
      path: '/api/test',
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    };

    const result = interceptor.intercept(options);

    expect(result.headers?.['Content-Type']).toBe('application/json');
    expect(result.headers?.['X-Trace-Id']).toBeDefined();
  });
});

describe('UserInfoRequestInterceptor', () => {
  test('should add user info header when available', () => {
    const interceptor = new UserInfoRequestInterceptor({
      userInfoProvider: () => 'user-123',
    });
    const options: ServiceCallOptions = {
      serviceName: 'test-service',
      path: '/api/test',
      method: 'GET',
    };

    const result = interceptor.intercept(options);

    expect(result.headers?.['X-User-Info']).toBe('user-123');
  });

  test('should not add header when user info is undefined', () => {
    const interceptor = new UserInfoRequestInterceptor({
      userInfoProvider: () => undefined,
    });
    const options: ServiceCallOptions = {
      serviceName: 'test-service',
      path: '/api/test',
      method: 'GET',
    };

    const result = interceptor.intercept(options);

    expect(result.headers?.['X-User-Info']).toBeUndefined();
  });

  test('should use custom header name', () => {
    const interceptor = new UserInfoRequestInterceptor({
      headerName: 'X-Current-User',
      userInfoProvider: () => 'alice',
    });
    const options: ServiceCallOptions = {
      serviceName: 'test-service',
      path: '/api/test',
      method: 'GET',
    };

    const result = interceptor.intercept(options);

    expect(result.headers?.['X-Current-User']).toBe('alice');
  });
});

describe('RequestLogInterceptor', () => {
  test('should log request with default logger', () => {
    const logs: string[] = [];
    const interceptor = new RequestLogInterceptor({
      logger: (msg) => logs.push(msg),
    });
    const options: ServiceCallOptions = {
      serviceName: 'user-service',
      path: '/api/users',
      method: 'GET',
    };

    const result = interceptor.intercept(options);

    expect(logs.length).toBe(1);
    expect(logs[0]).toContain('user-service');
    expect(logs[0]).toContain('/api/users');
    expect(logs[0]).toContain('GET');
    expect(result).toEqual(options);
  });

  test('should work without custom logger', () => {
    const interceptor = new RequestLogInterceptor();
    const options: ServiceCallOptions = {
      serviceName: 'test-service',
      path: '/api/test',
      method: 'POST',
    };

    // Should not throw
    expect(() => interceptor.intercept(options)).not.toThrow();
  });
});

describe('ResponseLogInterceptor', () => {
  const mockInstance: ServiceInstance = {
    serviceName: 'test-service',
    ip: '192.168.1.100',
    port: 8080,
  };

  test('should log response', () => {
    const logs: string[] = [];
    const interceptor = new ResponseLogInterceptor({
      logger: (msg) => logs.push(msg),
    });
    const response: ServiceCallResponse<string> = {
      data: 'test',
      status: 200,
      headers: {},
      instance: mockInstance,
    };

    const result = interceptor.intercept(response);

    expect(logs.length).toBe(1);
    expect(logs[0]).toContain('200');
    expect(logs[0]).toContain('192.168.1.100');
    expect(logs[0]).toContain('8080');
    expect(result).toEqual(response);
  });

  test('should work without custom logger', () => {
    const interceptor = new ResponseLogInterceptor();
    const response: ServiceCallResponse<string> = {
      data: 'test',
      status: 200,
      headers: {},
      instance: mockInstance,
    };

    expect(() => interceptor.intercept(response)).not.toThrow();
  });
});

describe('ResponseTransformInterceptor', () => {
  const mockInstance: ServiceInstance = {
    serviceName: 'test-service',
    ip: '127.0.0.1',
    port: 3000,
  };

  test('should transform response data', () => {
    const interceptor = new ResponseTransformInterceptor<
      { value: number },
      { result: number }
    >((data) => ({ result: data.value * 2 }));

    const response: ServiceCallResponse<{ value: number }> = {
      data: { value: 21 },
      status: 200,
      headers: {},
      instance: mockInstance,
    };

    const result = interceptor.intercept(response);

    expect(result.data).toEqual({ result: 42 });
    expect(result.status).toBe(200);
  });
});

describe('ErrorHandlerInterceptor', () => {
  const mockInstance: ServiceInstance = {
    serviceName: 'test-service',
    ip: '127.0.0.1',
    port: 3000,
  };

  test('should pass through successful response', () => {
    const interceptor = new ErrorHandlerInterceptor();
    const response: ServiceCallResponse<string> = {
      data: 'success',
      status: 200,
      headers: {},
      instance: mockInstance,
    };

    const result = interceptor.intercept(response);

    expect(result).toEqual(response);
  });

  test('should handle error response (status >= 400)', () => {
    const interceptor = new ErrorHandlerInterceptor();
    const response: ServiceCallResponse<{ error: string }> = {
      data: { error: 'Not Found' },
      status: 404,
      headers: {},
      instance: mockInstance,
    };

    const result = interceptor.intercept(response);

    // Should pass through but could add custom handling
    expect(result).toEqual(response);
  });

  test('should handle server error response', () => {
    const interceptor = new ErrorHandlerInterceptor();
    const response: ServiceCallResponse<{ error: string }> = {
      data: { error: 'Internal Server Error' },
      status: 500,
      headers: {},
      instance: mockInstance,
    };

    const result = interceptor.intercept(response);

    expect(result.status).toBe(500);
  });
});
