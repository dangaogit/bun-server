# @dangao/bun-server 国际化（i18n）功能请求

## 问题描述

当前 `@dangao/bun-server` 框架缺少国际化支持，无法根据用户语言提供本地化的消息和内容。这导致以下问题：

1. **无法本地化消息**：错误消息、验证消息等无法根据语言本地化
2. **缺少日期/数字格式化**：无法根据地区格式化日期和数字
3. **多语言支持困难**：需要手动实现多语言支持

## 功能需求

### 1. i18n 模块实现

框架应提供 `I18nModule`，支持国际化功能。

**期望实现**：

```typescript
I18nModule.forRoot({
  defaultLocale: 'en',
  locales: ['en', 'zh-CN', 'zh-TW'],
  messages: {
    en: {
      'user.not_found': 'User not found',
      'validation.required': 'This field is required',
    },
    'zh-CN': {
      'user.not_found': '用户不存在',
      'validation.required': '此字段为必填项',
    },
  },
});
```

### 2. 消息本地化

框架应支持根据用户语言获取本地化消息。

**期望实现**：

```typescript
@Injectable()
export class UserService {
  constructor(private readonly i18n: I18nService) {}

  async findUser(id: string) {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundException(
        this.i18n.t('user.not_found', { id })
      );
    }
    return user;
  }
}
```

### 3. 日期/数字格式化

框架应支持根据地区格式化日期和数字。

**期望实现**：

```typescript
@Injectable()
export class FormatService {
  constructor(private readonly i18n: I18nService) {}

  formatDate(date: Date): string {
    return this.i18n.formatDate(date, {
      locale: this.i18n.getCurrentLocale(),
    });
  }

  formatNumber(value: number): string {
    return this.i18n.formatNumber(value, {
      locale: this.i18n.getCurrentLocale(),
    });
  }
}
```

### 4. @I18n() 装饰器支持

框架应提供 `@I18n()` 装饰器，简化国际化使用。

**期望实现**：

```typescript
@Controller('/api/users')
export class UserController {
  @GET('/:id')
  async getUser(
    @Param('id') id: string,
    @I18n() i18n: I18nService,
  ) {
    // 使用 i18n 服务
  }
}
```

## 详细设计

### I18nModule 结构

```typescript
@Module({
  providers: [I18nService],
})
export class I18nModule {
  public static forRoot(options: I18nModuleOptions): typeof I18nModule {
    // 注册 I18nService
    // 配置默认语言和消息
  }
}
```

### I18nService 接口

```typescript
export interface I18nService {
  /**
   * 获取本地化消息
   */
  t(key: string, params?: Record<string, unknown>): string;

  /**
   * 获取当前语言
   */
  getCurrentLocale(): string;

  /**
   * 设置当前语言
   */
  setLocale(locale: string): void;

  /**
   * 格式化日期
   */
  formatDate(date: Date, options?: Intl.DateTimeFormatOptions): string;

  /**
   * 格式化数字
   */
  formatNumber(value: number, options?: Intl.NumberFormatOptions): string;
}
```

## 实现检查清单

### I18nModule 实现

- [ ] 实现 `I18nModule` 类
- [ ] 实现 `I18nService` 类
- [ ] 消息加载和管理
- [ ] 语言检测和切换

### 消息本地化实现

- [ ] 消息键值对管理
- [ ] 参数替换支持
- [ ] 消息文件加载（可选）

### 日期/数字格式化实现

- [ ] 使用 Intl API 格式化
- [ ] 支持多种地区格式
- [ ] 自定义格式选项

### @I18n() 装饰器实现

- [ ] 实现 `@I18n()` 装饰器
- [ ] 参数绑定支持
- [ ] 自动语言检测

### 文档和测试

- [ ] i18n 使用文档
- [ ] 添加使用示例
- [ ] 添加单元测试和集成测试

## 相关文件

### I18n 模块相关

- `src/i18n/i18n-module.ts` - I18nModule 实现
- `src/i18n/i18n-service.ts` - I18nService 实现
- `src/i18n/decorators.ts` - @I18n() 装饰器
- `src/i18n/types.ts` - i18n 相关类型定义

## 优先级

**低优先级** - 这是可选功能，根据需求决定是否实现。

