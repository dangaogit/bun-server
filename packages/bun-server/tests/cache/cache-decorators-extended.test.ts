import { describe, expect, test, beforeEach } from 'bun:test';
import 'reflect-metadata';

import {
  Cacheable,
  CacheEvict,
  CachePut,
  getCacheableMetadata,
  getCacheEvictMetadata,
  getCachePutMetadata,
  type CacheableOptions,
  type CacheEvictOptions,
  type CachePutOptions,
} from '../../src/cache/decorators';

describe('Cache Decorators', () => {
  describe('@Cacheable', () => {
    test('should set cacheable metadata with default options', () => {
      class TestService {
        @Cacheable()
        public findAll(): string[] {
          return ['a', 'b'];
        }
      }

      const metadata = getCacheableMetadata(TestService.prototype.findAll);
      expect(metadata).toBeDefined();
      expect(metadata?.key).toBeUndefined();
      expect(metadata?.keyPrefix).toBeUndefined();
      expect(metadata?.ttl).toBeUndefined();
      expect(metadata?.condition).toBeUndefined();
    });

    test('should set cacheable metadata with custom key', () => {
      class TestService {
        @Cacheable({ key: 'user:{0}' })
        public findById(id: string): string {
          return id;
        }
      }

      const metadata = getCacheableMetadata(TestService.prototype.findById);
      expect(metadata?.key).toBe('user:{0}');
    });

    test('should set cacheable metadata with keyPrefix', () => {
      class TestService {
        @Cacheable({ keyPrefix: 'users' })
        public findAll(): string[] {
          return [];
        }
      }

      const metadata = getCacheableMetadata(TestService.prototype.findAll);
      expect(metadata?.keyPrefix).toBe('users');
    });

    test('should set cacheable metadata with ttl', () => {
      class TestService {
        @Cacheable({ ttl: 60000 })
        public getData(): string {
          return 'data';
        }
      }

      const metadata = getCacheableMetadata(TestService.prototype.getData);
      expect(metadata?.ttl).toBe(60000);
    });

    test('should set cacheable metadata with condition', () => {
      class TestService {
        @Cacheable({ condition: 'result.status === "success"' })
        public fetchData(): { status: string } {
          return { status: 'success' };
        }
      }

      const metadata = getCacheableMetadata(TestService.prototype.fetchData);
      expect(metadata?.condition).toBe('result.status === "success"');
    });

    test('should set all options together', () => {
      const options: CacheableOptions = {
        key: 'item:{id}',
        keyPrefix: 'shop',
        ttl: 30000,
        condition: 'true',
      };

      class TestService {
        @Cacheable(options)
        public getItem(id: string): string {
          return id;
        }
      }

      const metadata = getCacheableMetadata(TestService.prototype.getItem);
      expect(metadata?.key).toBe('item:{id}');
      expect(metadata?.keyPrefix).toBe('shop');
      expect(metadata?.ttl).toBe(30000);
      expect(metadata?.condition).toBe('true');
    });
  });

  describe('@CacheEvict', () => {
    test('should set cache evict metadata with default options', () => {
      class TestService {
        @CacheEvict()
        public deleteAll(): void {}
      }

      const metadata = getCacheEvictMetadata(TestService.prototype.deleteAll);
      expect(metadata).toBeDefined();
      expect(metadata?.beforeInvocation).toBe(false);
      expect(metadata?.allEntries).toBe(false);
    });

    test('should set cache evict metadata with custom key', () => {
      class TestService {
        @CacheEvict({ key: 'user:{0}' })
        public deleteUser(id: string): void {}
      }

      const metadata = getCacheEvictMetadata(TestService.prototype.deleteUser);
      expect(metadata?.key).toBe('user:{0}');
    });

    test('should set beforeInvocation option', () => {
      class TestService {
        @CacheEvict({ beforeInvocation: true })
        public clearBefore(): void {}
      }

      const metadata = getCacheEvictMetadata(TestService.prototype.clearBefore);
      expect(metadata?.beforeInvocation).toBe(true);
    });

    test('should set allEntries option', () => {
      class TestService {
        @CacheEvict({ allEntries: true })
        public clearAll(): void {}
      }

      const metadata = getCacheEvictMetadata(TestService.prototype.clearAll);
      expect(metadata?.allEntries).toBe(true);
    });

    test('should set all options together', () => {
      const options: CacheEvictOptions = {
        key: 'item:{0}',
        keyPrefix: 'shop',
        beforeInvocation: true,
        allEntries: true,
      };

      class TestService {
        @CacheEvict(options)
        public clearShop(id: string): void {}
      }

      const metadata = getCacheEvictMetadata(TestService.prototype.clearShop);
      expect(metadata?.key).toBe('item:{0}');
      expect(metadata?.keyPrefix).toBe('shop');
      expect(metadata?.beforeInvocation).toBe(true);
      expect(metadata?.allEntries).toBe(true);
    });
  });

  describe('@CachePut', () => {
    test('should set cache put metadata with default options', () => {
      class TestService {
        @CachePut()
        public update(): string {
          return 'updated';
        }
      }

      const metadata = getCachePutMetadata(TestService.prototype.update);
      expect(metadata).toBeDefined();
      expect(metadata?.key).toBeUndefined();
      expect(metadata?.ttl).toBeUndefined();
      expect(metadata?.condition).toBeUndefined();
    });

    test('should set cache put metadata with custom key', () => {
      class TestService {
        @CachePut({ key: 'user:{0}' })
        public updateUser(id: string): string {
          return id;
        }
      }

      const metadata = getCachePutMetadata(TestService.prototype.updateUser);
      expect(metadata?.key).toBe('user:{0}');
    });

    test('should set cache put metadata with ttl', () => {
      class TestService {
        @CachePut({ ttl: 120000 })
        public refreshData(): string {
          return 'data';
        }
      }

      const metadata = getCachePutMetadata(TestService.prototype.refreshData);
      expect(metadata?.ttl).toBe(120000);
    });

    test('should set cache put metadata with condition', () => {
      class TestService {
        @CachePut({ condition: 'result !== null' })
        public saveData(): string | null {
          return 'data';
        }
      }

      const metadata = getCachePutMetadata(TestService.prototype.saveData);
      expect(metadata?.condition).toBe('result !== null');
    });

    test('should set all options together', () => {
      const options: CachePutOptions = {
        key: 'product:{0}',
        keyPrefix: 'inventory',
        ttl: 45000,
        condition: 'true',
      };

      class TestService {
        @CachePut(options)
        public updateProduct(id: string): string {
          return id;
        }
      }

      const metadata = getCachePutMetadata(TestService.prototype.updateProduct);
      expect(metadata?.key).toBe('product:{0}');
      expect(metadata?.keyPrefix).toBe('inventory');
      expect(metadata?.ttl).toBe(45000);
      expect(metadata?.condition).toBe('true');
    });
  });

  describe('Metadata getters', () => {
    test('getCacheableMetadata should return undefined for non-decorated method', () => {
      class TestService {
        public normalMethod(): void {}
      }

      const metadata = getCacheableMetadata(TestService.prototype.normalMethod);
      expect(metadata).toBeUndefined();
    });

    test('getCacheEvictMetadata should return undefined for non-decorated method', () => {
      class TestService {
        public normalMethod(): void {}
      }

      const metadata = getCacheEvictMetadata(TestService.prototype.normalMethod);
      expect(metadata).toBeUndefined();
    });

    test('getCachePutMetadata should return undefined for non-decorated method', () => {
      class TestService {
        public normalMethod(): void {}
      }

      const metadata = getCachePutMetadata(TestService.prototype.normalMethod);
      expect(metadata).toBeUndefined();
    });
  });
});
