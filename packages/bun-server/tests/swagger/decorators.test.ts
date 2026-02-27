import { describe, expect, test } from 'bun:test';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiBody,
  ApiResponse,
  getApiTags,
  getApiOperation,
  getApiParams,
  getApiBody,
  getApiResponses,
} from '../../src/swagger/decorators';

describe('Swagger Decorators', () => {
  describe('ApiTags', () => {
    test('should set tags on class', () => {
      @ApiTags('Users', 'Admin')
      class UserController {}

      const tags = getApiTags(UserController);
      expect(tags).toEqual(['Users', 'Admin']);
    });

    test('should set tags on method', () => {
      class UserController {
        @ApiTags('Public')
        public getUsers() {}
      }

      const tags = getApiTags(UserController.prototype, 'getUsers');
      expect(tags).toEqual(['Public']);
    });

    test('should merge tags on method', () => {
      class UserController {
        @ApiTags('Users')
        @ApiTags('Admin')
        public getUsers() {}
      }

      const tags = getApiTags(UserController.prototype, 'getUsers');
      // 顺序可能不同，但应该包含两个标签
      expect(tags).toContain('Users');
      expect(tags).toContain('Admin');
      expect(tags.length).toBe(2);
    });
  });

  describe('ApiOperation', () => {
    test('should set operation metadata', () => {
      class UserController {
        @ApiOperation({ summary: 'Get users', description: 'Get all users' })
        public getUsers() {}
      }

      const operation = getApiOperation(UserController.prototype, 'getUsers');
      expect(operation).toBeDefined();
      expect(operation?.summary).toBe('Get users');
      expect(operation?.description).toBe('Get all users');
    });
  });

  describe('ApiParam', () => {
    test('should set param metadata', () => {
      class UserController {
        public getUser(
          @ApiParam({ name: 'id', description: 'User ID', required: true })
          id: string,
        ) {}
      }

      const params = getApiParams(UserController.prototype, 'getUser');
      expect(params).toBeDefined();
      expect(params.length).toBe(1);
      expect(params[0].metadata.name).toBe('id');
      expect(params[0].metadata.description).toBe('User ID');
      expect(params[0].metadata.required).toBe(true);
    });

    test('should handle multiple params', () => {
      class UserController {
        public getUserPost(
          @ApiParam({ name: 'id', description: 'User ID' })
          id: string,
          @ApiParam({ name: 'postId', description: 'Post ID' })
          postId: string,
        ) {}
      }

      const params = getApiParams(UserController.prototype, 'getUserPost');
      expect(params.length).toBe(2);
      // 参数顺序可能不同，但应该包含两个参数
      const paramNames = params.map((p) => p.metadata.name);
      expect(paramNames).toContain('id');
      expect(paramNames).toContain('postId');
    });
  });

  describe('ApiBody', () => {
    test('should set body metadata', () => {
      class UserController {
        @ApiBody({
          description: 'User data',
          schema: {
            type: 'object',
            properties: {
              name: { type: 'string' },
            },
          },
        })
        public createUser() {}
      }

      const body = getApiBody(UserController.prototype, 'createUser');
      expect(body).toBeDefined();
      expect(body?.description).toBe('User data');
      expect(body?.schema).toBeDefined();
    });
  });

  describe('ApiResponse', () => {
    test('should set response metadata', () => {
      class UserController {
        @ApiResponse({ status: 200, description: 'Success' })
        public getUsers() {}
      }

      const responses = getApiResponses(UserController.prototype, 'getUsers');
      expect(responses).toBeDefined();
      expect(responses.length).toBe(1);
      expect(responses[0].status).toBe(200);
      expect(responses[0].description).toBe('Success');
    });

    test('should handle multiple responses', () => {
      class UserController {
        @ApiResponse({ status: 200, description: 'Success' })
        @ApiResponse({ status: 404, description: 'Not found' })
        public getUser() {}
      }

      const responses = getApiResponses(UserController.prototype, 'getUser');
      expect(responses.length).toBe(2);
      // 响应顺序可能不同，但应该包含两个响应
      const statuses = responses.map((r) => r.status);
      expect(statuses).toContain(200);
      expect(statuses).toContain(404);
    });
  });
});

