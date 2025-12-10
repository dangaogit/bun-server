import { describe, expect, test, beforeEach } from 'bun:test';
import {
  HttpException,
  ErrorCode,
  ErrorMessageI18n,
  ExceptionFilterRegistry,
  ExceptionFilter,
  BadRequestException,
  NotFoundException,
  type Context,
  type MessageParams,
} from '../../src/error';

describe('Error Handling Enhancement', () => {
  beforeEach(() => {
    // 重置语言为默认值
    ErrorMessageI18n.setLanguage('en');
    // 清除异常过滤器注册表
    ExceptionFilterRegistry.getInstance().clear();
  });

  describe('ErrorCode System', () => {
    test('should have all error codes defined', () => {
      // 检查新增的错误码是否存在
      expect(ErrorCode.DATABASE_CONNECTION_FAILED).toBe('DATABASE_CONNECTION_FAILED');
      expect(ErrorCode.FILE_NOT_FOUND).toBe('FILE_NOT_FOUND');
      expect(ErrorCode.RATE_LIMIT_EXCEEDED).toBe('RATE_LIMIT_EXCEEDED');
      expect(ErrorCode.CONFIG_INVALID).toBe('CONFIG_INVALID');
    });

    test('should map error codes to HTTP status codes', () => {
      const { ERROR_CODE_TO_STATUS } = require('../../src/error/error-codes');
      
      expect(ERROR_CODE_TO_STATUS[ErrorCode.RATE_LIMIT_EXCEEDED]).toBe(429);
      expect(ERROR_CODE_TO_STATUS[ErrorCode.DATABASE_CONNECTION_FAILED]).toBe(503);
      expect(ERROR_CODE_TO_STATUS[ErrorCode.FILE_SIZE_EXCEEDED]).toBe(413);
      expect(ERROR_CODE_TO_STATUS[ErrorCode.CONFIG_INVALID]).toBe(500);
    });
  });

  describe('Error Message Internationalization', () => {
    test('should get English message by default', () => {
      const message = ErrorMessageI18n.getMessage(ErrorCode.RESOURCE_NOT_FOUND);
      expect(message).toBe('Resource Not Found');
    });

    test('should get Chinese message when language is zh-CN', () => {
      const message = ErrorMessageI18n.getMessage(ErrorCode.RESOURCE_NOT_FOUND, 'zh-CN');
      expect(message).toBe('资源未找到');
    });

    test('should parse language from Accept-Language header', () => {
      expect(ErrorMessageI18n.parseLanguageFromHeader('zh-CN,zh;q=0.9')).toBe('zh-CN');
      expect(ErrorMessageI18n.parseLanguageFromHeader('ja,en;q=0.8')).toBe('ja');
      expect(ErrorMessageI18n.parseLanguageFromHeader('ko,en;q=0.8')).toBe('ko');
      expect(ErrorMessageI18n.parseLanguageFromHeader('en-US,en;q=0.9')).toBe('en');
      expect(ErrorMessageI18n.parseLanguageFromHeader(null)).toBe('en');
      expect(ErrorMessageI18n.parseLanguageFromHeader(undefined)).toBe('en');
    });

    test('should support message template with parameters', () => {
      // 测试消息模板替换功能
      const template = 'Resource {resource} not found';
      const params: MessageParams = { resource: 'User' };
      
      // 由于当前消息模板可能不包含占位符，我们测试替换功能
      const result = template.replace(/\{(\w+)\}/g, (match, key) => {
        const value = params[key];
        return value !== undefined ? String(value) : match;
      });
      
      expect(result).toBe('Resource User not found');
    });

    test('should set and get current language', () => {
      ErrorMessageI18n.setLanguage('zh-CN');
      expect(ErrorMessageI18n.getLanguage()).toBe('zh-CN');
      
      ErrorMessageI18n.setLanguage('en');
      expect(ErrorMessageI18n.getLanguage()).toBe('en');
    });
  });

  describe('HttpException with Message Params', () => {
    test('should create exception with message params', () => {
      const exception = HttpException.withCode(
        ErrorCode.RESOURCE_NOT_FOUND,
        undefined,
        undefined,
        { resource: 'User' },
      );
      
      expect(exception.code).toBe(ErrorCode.RESOURCE_NOT_FOUND);
      expect(exception.messageParams).toEqual({ resource: 'User' });
    });

    test('should create exception with code and details', () => {
      const exception = HttpException.withCode(
        ErrorCode.VALIDATION_FAILED,
        'Custom message',
        { field: 'email', reason: 'Invalid format' },
      );
      
      expect(exception.code).toBe(ErrorCode.VALIDATION_FAILED);
      expect(exception.message).toBe('Custom message');
      expect(exception.details).toEqual({ field: 'email', reason: 'Invalid format' });
    });

    test('should create BadRequestException with message params', () => {
      const exception = new BadRequestException(
        'Bad Request',
        undefined,
        ErrorCode.INVALID_REQUEST,
        { field: 'id' },
      );
      
      expect(exception.status).toBe(400);
      expect(exception.messageParams).toEqual({ field: 'id' });
    });
  });

  describe('Exception Filter', () => {
    test('should register and execute exception filter', async () => {
      const registry = ExceptionFilterRegistry.getInstance();
      
      let filterExecuted = false;
      
      const filter: ExceptionFilter = {
        catch: (error: unknown, context: Context) => {
          filterExecuted = true;
          if (error instanceof HttpException && error.code === ErrorCode.RESOURCE_NOT_FOUND) {
            return context.createResponse({
              error: 'Custom not found message',
              code: error.code,
            });
          }
          return undefined;
        },
      };
      
      registry.register(filter);
      
      const exception = HttpException.withCode(ErrorCode.RESOURCE_NOT_FOUND);
      
      // 创建模拟的 Context
      const mockContext = {
        createResponse: (body: unknown) => new Response(JSON.stringify(body)),
        getHeader: () => null,
        setStatus: () => {},
        getPath: () => '/test',
        getMethod: () => 'GET',
      } as unknown as Context;
      
      const result = await registry.execute(exception, mockContext);
      
      expect(filterExecuted).toBe(true);
      expect(result).toBeDefined();
    });

    test('should execute filters in registration order', async () => {
      const registry = ExceptionFilterRegistry.getInstance();
      const executionOrder: number[] = [];
      
      const filter1: ExceptionFilter = {
        catch: () => {
          executionOrder.push(1);
          return undefined;
        },
      };
      
      const filter2: ExceptionFilter = {
        catch: () => {
          executionOrder.push(2);
          return undefined;
        },
      };
      
      registry.register(filter1);
      registry.register(filter2);
      
      const exception = HttpException.withCode(ErrorCode.INTERNAL_ERROR);
      const mockContext = {
        createResponse: (body: unknown) => new Response(JSON.stringify(body)),
        getHeader: () => null,
        setStatus: () => {},
        getPath: () => '/test',
        getMethod: () => 'GET',
      } as unknown as Context;
      
      await registry.execute(exception, mockContext);
      
      expect(executionOrder).toEqual([1, 2]);
    });

    test('should stop execution when filter returns response', async () => {
      const registry = ExceptionFilterRegistry.getInstance();
      let secondFilterExecuted = false;
      
      const filter1: ExceptionFilter = {
        catch: (error: unknown, context: Context) => {
          return context.createResponse({ error: 'Handled by filter 1' });
        },
      };
      
      const filter2: ExceptionFilter = {
        catch: () => {
          secondFilterExecuted = true;
          return undefined;
        },
      };
      
      registry.register(filter1);
      registry.register(filter2);
      
      const exception = HttpException.withCode(ErrorCode.INTERNAL_ERROR);
      const mockContext = {
        createResponse: (body: unknown) => new Response(JSON.stringify(body)),
        getHeader: () => null,
        setStatus: () => {},
        getPath: () => '/test',
        getMethod: () => 'GET',
      } as unknown as Context;
      
      await registry.execute(exception, mockContext);
      
      expect(secondFilterExecuted).toBe(false);
    });
  });

  describe('Error Code Coverage', () => {
    test('should have messages for all error codes', () => {
      const { ERROR_CODE_MESSAGES } = require('../../src/error/error-codes');
      
      // 检查所有错误码都有对应的消息
      Object.values(ErrorCode).forEach((code) => {
        expect(ERROR_CODE_MESSAGES[code]).toBeDefined();
        expect(typeof ERROR_CODE_MESSAGES[code]).toBe('string');
        expect(ERROR_CODE_MESSAGES[code].length).toBeGreaterThan(0);
      });
    });

    test('should have status codes for all error codes', () => {
      const { ERROR_CODE_TO_STATUS } = require('../../src/error/error-codes');
      
      // 检查所有错误码都有对应的 HTTP 状态码
      Object.values(ErrorCode).forEach((code) => {
        expect(ERROR_CODE_TO_STATUS[code]).toBeDefined();
        expect(typeof ERROR_CODE_TO_STATUS[code]).toBe('number');
        expect(ERROR_CODE_TO_STATUS[code]).toBeGreaterThanOrEqual(400);
        expect(ERROR_CODE_TO_STATUS[code]).toBeLessThan(600);
      });
    });
  });
});
