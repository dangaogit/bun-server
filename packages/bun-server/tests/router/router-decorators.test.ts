import { describe, expect, test, beforeEach } from 'bun:test';
import 'reflect-metadata';

import {
  GET,
  POST,
  PUT,
  DELETE,
  PATCH,
  ROUTE_METADATA_KEY,
  type RouteMetadata,
} from '../../src/router/decorators';
import { Controller } from '../../src/controller/controller';

describe('Router Decorators', () => {
  describe('@GET', () => {
    test('should set route metadata for GET method', () => {
      class TestController {
        @GET('/users')
        public getUsers(): string[] {
          return [];
        }
      }

      const routes = Reflect.getMetadata(
        ROUTE_METADATA_KEY,
        TestController.prototype,
      ) as RouteMetadata[];

      expect(routes).toBeDefined();
      expect(routes.length).toBe(1);
      expect(routes[0].method).toBe('GET');
      expect(routes[0].path).toBe('/users');
      expect(routes[0].propertyKey).toBe('getUsers');
    });

    test('should handle path with parameters', () => {
      class TestController {
        @GET('/users/:id')
        public getUser(id: string): void {}
      }

      const routes = Reflect.getMetadata(
        ROUTE_METADATA_KEY,
        TestController.prototype,
      ) as RouteMetadata[];

      expect(routes[0].path).toBe('/users/:id');
    });

    test('should handle root path', () => {
      class TestController {
        @GET('/')
        public getRoot(): void {}
      }

      const routes = Reflect.getMetadata(
        ROUTE_METADATA_KEY,
        TestController.prototype,
      ) as RouteMetadata[];

      expect(routes[0].path).toBe('/');
    });
  });

  describe('@POST', () => {
    test('should set route metadata for POST method', () => {
      class TestController {
        @POST('/users')
        public createUser(): void {}
      }

      const routes = Reflect.getMetadata(
        ROUTE_METADATA_KEY,
        TestController.prototype,
      ) as RouteMetadata[];

      expect(routes).toBeDefined();
      expect(routes.length).toBe(1);
      expect(routes[0].method).toBe('POST');
      expect(routes[0].path).toBe('/users');
    });
  });

  describe('@PUT', () => {
    test('should set route metadata for PUT method', () => {
      class TestController {
        @PUT('/users/:id')
        public updateUser(id: string): void {}
      }

      const routes = Reflect.getMetadata(
        ROUTE_METADATA_KEY,
        TestController.prototype,
      ) as RouteMetadata[];

      expect(routes).toBeDefined();
      expect(routes[0].method).toBe('PUT');
      expect(routes[0].path).toBe('/users/:id');
    });
  });

  describe('@DELETE', () => {
    test('should set route metadata for DELETE method', () => {
      class TestController {
        @DELETE('/users/:id')
        public deleteUser(id: string): void {}
      }

      const routes = Reflect.getMetadata(
        ROUTE_METADATA_KEY,
        TestController.prototype,
      ) as RouteMetadata[];

      expect(routes).toBeDefined();
      expect(routes[0].method).toBe('DELETE');
      expect(routes[0].path).toBe('/users/:id');
    });
  });

  describe('@PATCH', () => {
    test('should set route metadata for PATCH method', () => {
      class TestController {
        @PATCH('/users/:id')
        public patchUser(id: string): void {}
      }

      const routes = Reflect.getMetadata(
        ROUTE_METADATA_KEY,
        TestController.prototype,
      ) as RouteMetadata[];

      expect(routes).toBeDefined();
      expect(routes[0].method).toBe('PATCH');
      expect(routes[0].path).toBe('/users/:id');
    });
  });

  describe('Multiple routes', () => {
    test('should accumulate multiple routes on same controller', () => {
      class TestController {
        @GET('/items')
        public getItems(): void {}

        @POST('/items')
        public createItem(): void {}

        @GET('/items/:id')
        public getItem(id: string): void {}

        @PUT('/items/:id')
        public updateItem(id: string): void {}

        @DELETE('/items/:id')
        public deleteItem(id: string): void {}
      }

      const routes = Reflect.getMetadata(
        ROUTE_METADATA_KEY,
        TestController.prototype,
      ) as RouteMetadata[];

      expect(routes).toBeDefined();
      expect(routes.length).toBe(5);

      const methods = routes.map((r) => r.method);
      expect(methods).toContain('GET');
      expect(methods).toContain('POST');
      expect(methods).toContain('PUT');
      expect(methods).toContain('DELETE');
    });

    test('should preserve route order', () => {
      class TestController {
        @GET('/first')
        public first(): void {}

        @GET('/second')
        public second(): void {}

        @GET('/third')
        public third(): void {}
      }

      const routes = Reflect.getMetadata(
        ROUTE_METADATA_KEY,
        TestController.prototype,
      ) as RouteMetadata[];

      expect(routes[0].path).toBe('/first');
      expect(routes[1].path).toBe('/second');
      expect(routes[2].path).toBe('/third');
    });
  });

  describe('With @Controller', () => {
    test('should work with @Controller decorator', () => {
      @Controller('/api')
      class ApiController {
        @GET('/data')
        public getData(): void {}
      }

      const routes = Reflect.getMetadata(
        ROUTE_METADATA_KEY,
        ApiController.prototype,
      ) as RouteMetadata[];

      expect(routes).toBeDefined();
      expect(routes.length).toBe(1);
      expect(routes[0].path).toBe('/data');
    });
  });

  describe('Edge cases', () => {
    test('should handle empty path', () => {
      class TestController {
        @GET('')
        public getEmpty(): void {}
      }

      const routes = Reflect.getMetadata(
        ROUTE_METADATA_KEY,
        TestController.prototype,
      ) as RouteMetadata[];

      expect(routes[0].path).toBe('');
    });

    test('should handle paths with query string patterns', () => {
      class TestController {
        @GET('/search')
        public search(): void {}
      }

      const routes = Reflect.getMetadata(
        ROUTE_METADATA_KEY,
        TestController.prototype,
      ) as RouteMetadata[];

      expect(routes[0].path).toBe('/search');
    });

    test('should store handler reference', () => {
      class TestController {
        @GET('/test')
        public testMethod(): string {
          return 'test';
        }
      }

      const routes = Reflect.getMetadata(
        ROUTE_METADATA_KEY,
        TestController.prototype,
      ) as RouteMetadata[];

      expect(routes[0].handler).toBe(TestController.prototype.testMethod);
    });
  });
});
