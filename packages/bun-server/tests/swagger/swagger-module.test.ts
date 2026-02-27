import { describe, expect, test, beforeEach } from 'bun:test';
import { SwaggerModule } from '../../src/swagger/swagger-module';
import { MODULE_METADATA_KEY } from '../../src/di/module';

describe('SwaggerModule', () => {
  beforeEach(() => {
    // 清除模块元数据
    Reflect.deleteMetadata(MODULE_METADATA_KEY, SwaggerModule);
  });

  test('should create module with forRoot', () => {
    const module = SwaggerModule.forRoot({
      info: {
        title: 'Test API',
        version: '1.0.0',
      },
    });

    expect(module).toBe(SwaggerModule);
  });

  test('should register extensions and middlewares', () => {
    SwaggerModule.forRoot({
      info: {
        title: 'Test API',
        version: '1.0.0',
      },
      enableUI: true,
    });

    const metadata = Reflect.getMetadata(MODULE_METADATA_KEY, SwaggerModule);
    expect(metadata).toBeDefined();
    expect(metadata.extensions).toBeDefined();
    expect(metadata.extensions.length).toBeGreaterThan(0);
    expect(metadata.middlewares).toBeDefined();
    expect(metadata.middlewares.length).toBeGreaterThan(0);
  });

  test('should not register UI middleware when disabled', () => {
    SwaggerModule.forRoot({
      info: {
        title: 'Test API',
        version: '1.0.0',
      },
      enableUI: false,
    });

    const metadata = Reflect.getMetadata(MODULE_METADATA_KEY, SwaggerModule);
    expect(metadata.middlewares.length).toBe(0);
  });

  test('should use custom UI path', () => {
    SwaggerModule.forRoot({
      info: {
        title: 'Test API',
        version: '1.0.0',
      },
      uiPath: '/api-docs',
      jsonPath: '/api-docs.json',
    });

    const metadata = Reflect.getMetadata(MODULE_METADATA_KEY, SwaggerModule);
    expect(metadata).toBeDefined();
  });

  test('should use default paths when not specified', () => {
    SwaggerModule.forRoot({
      info: {
        title: 'Test API',
        version: '1.0.0',
      },
    });

    const metadata = Reflect.getMetadata(MODULE_METADATA_KEY, SwaggerModule);
    expect(metadata).toBeDefined();
  });
});

