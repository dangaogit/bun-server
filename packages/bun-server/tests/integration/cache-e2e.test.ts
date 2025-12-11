import { describe, expect, test, beforeEach, afterEach } from 'bun:test';
import {
  Application,
  CacheModule,
  CacheService,
  CACHE_SERVICE_TOKEN,
  ConfigModule,
  Controller,
  GET,
  Inject,
  Injectable,
  Module,
  Param,
} from '../../src';
import { getTestPort } from '../utils/test-port';

@Injectable()
class ProductService {
  public constructor(
    @Inject(CACHE_SERVICE_TOKEN) private readonly cache: CacheService,
  ) {}

  public async getProduct(id: string): Promise<{ id: string; name: string }> {
    return await this.cache.getOrSet(
      `product:${id}`,
      async () => {
        // 模拟数据库查询
        await new Promise((resolve) => setTimeout(resolve, 50));
        return { id, name: `Product ${id}` };
      },
      60000,
    );
  }
}

@Controller('/api/products')
class ProductController {
  public constructor(
    @Inject(ProductService) private readonly productService: ProductService,
  ) {}

  @GET('/:id')
  public async getProduct(@Param('id') id: string) {
    return await this.productService.getProduct(id);
  }
}

@Module({
  controllers: [ProductController],
  providers: [ProductService],
})
class AppModule {}

describe('Cache E2E', () => {
  let app: Application;
  let port: number;

  beforeEach(async () => {
    port = getTestPort();
    ConfigModule.forRoot({
      defaultConfig: { app: { name: 'Cache E2E Test', port } },
    });
    CacheModule.forRoot({
      defaultTtl: 60000,
    });
    app = new Application({ port });
    app.registerModule(CacheModule);
    app.registerModule(AppModule);
    await app.listen();
  });

  afterEach(async () => {
    await app.stop();
  });

  test('should cache product data', async () => {
    const start1 = Date.now();
    const response1 = await fetch(`http://localhost:${port}/api/products/1`);
    const time1 = Date.now() - start1;
    if (response1.status !== 200) {
      const errorText = await response1.text();
      console.error('Error response:', errorText);
    }
    expect(response1.status).toBe(200);
    const data1 = await response1.json();
    expect(data1.id).toBe('1');
    expect(data1.name).toBe('Product 1');
    expect(time1).toBeGreaterThan(40); // 第一次查询需要时间

    const start2 = Date.now();
    const response2 = await fetch(`http://localhost:${port}/api/products/1`);
    const time2 = Date.now() - start2;
    expect(response2.status).toBe(200);
    const data2 = await response2.json();
    expect(data2).toEqual(data1);
    expect(time2).toBeLessThan(10); // 第二次查询应该很快（从缓存）
  });

  test('should cache different products separately', async () => {
    const response1 = await fetch(`http://localhost:${port}/api/products/1`);
    const response2 = await fetch(`http://localhost:${port}/api/products/2`);

    expect(response1.status).toBe(200);
    expect(response2.status).toBe(200);

    const data1 = await response1.json();
    const data2 = await response2.json();

    expect(data1.id).toBe('1');
    expect(data2.id).toBe('2');
    expect(data1.name).toBe('Product 1');
    expect(data2.name).toBe('Product 2');
  });
});
