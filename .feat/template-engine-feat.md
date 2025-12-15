# @dangao/bun-server 模板引擎功能请求

## 问题描述

当前 `@dangao/bun-server` 框架仅支持 JSON 响应，缺少服务端渲染（SSR）支持。这导致以下问题：

1. **无法服务端渲染**：无法生成 HTML 页面
2. **缺少模板支持**：无法使用模板引擎渲染动态内容
3. **SEO 不友好**：纯 API 服务对 SEO 不友好

## 功能需求

### 1. 服务端渲染支持

框架应支持服务端渲染，生成 HTML 响应。

**期望实现**：

```typescript
@Controller('/')
export class HomeController {
  @GET('/')
  @Render('index') // 渲染模板
  async home() {
    return {
      title: 'Welcome',
      users: await this.userService.findAll(),
    };
  }
}
```

### 2. 模板引擎集成

框架应支持多种模板引擎（如 EJS, Handlebars）。

**期望实现**：

```typescript
TemplateModule.forRoot({
  engine: 'ejs', // 或 'handlebars'
  viewsDir: './views',
  options: {
    // 模板引擎选项
  },
});
```

### 3. 模板渲染装饰器支持

框架应提供模板渲染装饰器。

**期望实现**：

```typescript
@Controller('/')
export class HomeController {
  @GET('/')
  @Render('index') // 渲染 views/index.ejs
  async home() {
    return {
      title: 'Welcome',
    };
  }

  @GET('/about')
  @Render('about', { layout: 'main' }) // 使用布局
  async about() {
    return {
      title: 'About Us',
    };
  }
}
```

## 详细设计

### TemplateModule 结构

```typescript
@Module({
  providers: [TemplateService],
})
export class TemplateModule {
  public static forRoot(options: TemplateModuleOptions): typeof TemplateModule {
    // 注册 TemplateService
    // 配置模板引擎和视图目录
  }
}
```

### TemplateService 接口

```typescript
export interface TemplateService {
  /**
   * 渲染模板
   */
  render(template: string, data: Record<string, unknown>): Promise<string>;

  /**
   * 渲染模板并返回 Response
   */
  renderResponse(
    template: string,
    data: Record<string, unknown>,
  ): Promise<Response>;
}
```

## 实现检查清单

### 模板引擎集成

- [ ] 集成 EJS 模板引擎
- [ ] 集成 Handlebars 模板引擎（可选）
- [ ] 实现 TemplateModule
- [ ] 实现 TemplateService

### 模板渲染装饰器实现

- [ ] 实现 `@Render()` 装饰器
- [ ] 模板路径解析
- [ ] 数据传递和渲染
- [ ] 布局支持（可选）

### 文档和测试

- [ ] 模板引擎使用文档
- [ ] 添加使用示例
- [ ] 添加单元测试和集成测试

## 相关文件

### 模板引擎模块相关

- `src/template/template-module.ts` - TemplateModule 实现
- `src/template/template-service.ts` - TemplateService 实现
- `src/template/decorators.ts` - @Render() 装饰器
- `src/template/types.ts` - 模板相关类型定义

## 优先级

**低优先级** - 这是可选功能，根据需求决定是否实现。

