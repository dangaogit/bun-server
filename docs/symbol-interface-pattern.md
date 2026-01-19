# Symbol + Interface 同名模式详解

## 📖 背景

TypeScript 在编译为 JavaScript 后，所有类型信息都会丢失。这给依赖注入框架带来了挑战：如何在运行时识别注入的依赖类型？

## 🎯 解决方案

Bun Server Framework 采用 **Symbol + Interface 同名模式**，优雅地解决了这个问题。

## 💡 核心概念

### 传统方式的问题

```typescript
// ❌ 传统方式：只能注入具体类
interface UserService {
  find(id: string): Promise<User>;
}

@Injectable()
class UserServiceImpl implements UserService {
  async find(id: string) { ... }
}

// 问题：TypeScript 编译后 interface 消失
// 无法在运行时通过 interface 类型进行注入
public constructor(
  private readonly userService: UserService  // 编译后类型信息丢失
) {}
```

### Symbol + Interface 同名模式

```typescript
// ✅ Bun Server 方式：Symbol + Interface 同名

// 1. 定义接口（编译时类型检查）
interface UserService {
  find(id: string): Promise<User>;
  create(user: User): Promise<User>;
}

// 2. 定义同名 Symbol（运行时 Token）
// 注意：声明为 const，与 interface 同名
const UserService = Symbol('UserService');

// 3. 实现接口
@Injectable()
class UserServiceImpl implements UserService {
  public async find(id: string): Promise<User> {
    // 实现...
  }
  
  public async create(user: User): Promise<User> {
    // 实现...
  }
}

// 4. 在 Module 中配置
@Module({
  providers: [{
    provide: UserService,      // Symbol Token（运行时）
    useClass: UserServiceImpl, // 实现类
  }],
  exports: [UserServiceImpl],  // 导出实现类（可选）
})
class UserModule {}

// 5. 注入使用
@Controller('/users')
class UserController {
  public constructor(
    // 类型是 interface UserService（编译时检查）
    // 实际注入的是 Symbol('UserService') 对应的实例（运行时）
    private readonly userService: UserService,
  ) {}
  
  @GET('/:id')
  public async getUser(@Param('id') id: string) {
    // TypeScript 知道 userService 有 find 方法
    return await this.userService.find(id);
  }
}
```

## 🔑 关键要点

### 1. 导入时不能使用 `import type`

```typescript
// ✅ 正确：同时导入 Symbol 和 interface
import { UserService } from './user-service';

// ❌ 错误：只导入类型，Symbol 丢失
import type { UserService } from './user-service';

// ❌ 错误：混合导入会导致混淆
import { type UserService } from './user-service';
```

**原因**：`import type` 只导入类型信息，编译后会被完全移除，导致 Symbol 丢失。

### 2. 导出顺序

```typescript
// 推荐的文件组织方式

// user-service.ts
// 1. 导入依赖
import { Injectable } from '@dangao/bun-server';

// 2. 定义接口
export interface UserService {
  find(id: string): Promise<User>;
}

// 3. 定义 Symbol（与接口同名）
export const UserService = Symbol('UserService');

// 4. 实现类
@Injectable()
export class UserServiceImpl implements UserService {
  public async find(id: string): Promise<User> {
    // ...
  }
}
```

### 3. Module 配置

```typescript
@Module({
  providers: [
    {
      provide: UserService,      // 使用 Symbol 作为 Token
      useClass: UserServiceImpl, // 指定实现类
    }
  ],
  exports: [UserServiceImpl],    // 导出实现类（供其他模块使用）
})
class UserModule {}
```

**注意**：
- `provide` 使用 Symbol Token
- `exports` 导出实现类（不是 Symbol）

### 4. 构造函数注入

```typescript
// ✅ 推荐：默认注入（无需装饰器）
public constructor(
  private readonly userService: UserService,  // 框架自动识别类型
) {}

// ⚠️ 仅在以下情况使用 @Inject
public constructor(
  @Inject(UserService) private readonly userService: UserService,
) {}
```

## 📋 完整示例

### 步骤 1：定义服务接口和实现

```typescript
// src/user/user-service.ts

import { Injectable } from '@dangao/bun-server';

// 1. 定义用户实体
export interface User {
  id: string;
  name: string;
  email: string;
}

// 2. 定义服务接口
export interface UserService {
  find(id: string): Promise<User | undefined>;
  create(name: string, email: string): Promise<User>;
  findAll(): Promise<User[]>;
}

// 3. 定义同名 Symbol
export const UserService = Symbol('UserService');

// 4. 实现服务
@Injectable()
export class UserServiceImpl implements UserService {
  private readonly users = new Map<string, User>();

  public async find(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  public async create(name: string, email: string): Promise<User> {
    const id = String(this.users.size + 1);
    const user = { id, name, email };
    this.users.set(id, user);
    return user;
  }

  public async findAll(): Promise<User[]> {
    return Array.from(this.users.values());
  }
}
```

### 步骤 2：创建控制器

```typescript
// src/user/user-controller.ts

import { Controller, GET, POST, Body, Param } from '@dangao/bun-server';
// ✅ 注意：不要用 import type
import { UserService } from './user-service';

@Controller('/api/users')
export class UserController {
  // 构造函数注入，框架自动识别类型
  public constructor(
    private readonly userService: UserService,
  ) {}

  @GET('/')
  public async getAllUsers() {
    return await this.userService.findAll();
  }

  @GET('/:id')
  public async getUser(@Param('id') id: string) {
    const user = await this.userService.find(id);
    if (!user) {
      return { error: 'User not found' };
    }
    return user;
  }

  @POST('/')
  public async createUser(@Body() body: { name: string; email: string }) {
    return await this.userService.create(body.name, body.email);
  }
}
```

### 步骤 3：配置模块

```typescript
// src/user/user-module.ts

import { Module } from '@dangao/bun-server';
import { UserController } from './user-controller';
import { UserService, UserServiceImpl } from './user-service';

@Module({
  controllers: [UserController],
  providers: [
    {
      provide: UserService,      // Symbol Token
      useClass: UserServiceImpl, // 实现类
    }
  ],
  exports: [UserServiceImpl],    // 导出供其他模块使用
})
export class UserModule {}
```

### 步骤 4：启动应用

```typescript
// src/main.ts

import { Application } from '@dangao/bun-server';
import { UserModule } from './user/user-module';

const app = new Application({ port: 3000 });
app.registerModule(UserModule);
app.listen();

console.log('Server running on http://localhost:3000');
```

## 🎨 高级用法

### 多实现切换

```typescript
// 定义接口和 Symbol
export interface CacheService {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
}
export const CacheService = Symbol('CacheService');

// 内存实现
@Injectable()
export class MemoryCacheService implements CacheService {
  private cache = new Map<string, string>();
  
  async get(key: string) {
    return this.cache.get(key) ?? null;
  }
  
  async set(key: string, value: string) {
    this.cache.set(key, value);
  }
}

// Redis 实现
@Injectable()
export class RedisCacheService implements CacheService {
  async get(key: string) {
    // Redis 实现...
  }
  
  async set(key: string, value: string) {
    // Redis 实现...
  }
}

// 根据环境切换实现
const isProduction = process.env.NODE_ENV === 'production';

@Module({
  providers: [
    {
      provide: CacheService,
      useClass: isProduction ? RedisCacheService : MemoryCacheService,
    }
  ],
})
export class CacheModule {}
```

### 工厂函数

```typescript
// 使用工厂函数创建实例
@Module({
  providers: [
    {
      provide: UserService,
      useFactory: (container: Container) => {
        const config = container.resolve<ConfigService>(CONFIG_SERVICE_TOKEN);
        if (config.get('database.type') === 'mongodb') {
          return new MongoUserService();
        }
        return new PostgresUserService();
      },
    }
  ],
})
export class UserModule {}
```

## ❓ 常见问题

### Q1: 为什么不直接使用类作为 Token？

**A**: 使用类作为 Token 有以下问题：
1. 无法实现面向接口编程
2. 紧耦合实现类，不利于测试
3. 无法在运行时动态切换实现

Symbol + Interface 模式提供了更好的灵活性。

### Q2: Symbol 和 String Token 有什么区别？

```typescript
// Symbol Token（推荐）
const UserService = Symbol('UserService');

// String Token（不推荐）
const USER_SERVICE_TOKEN = 'UserService';
```

**区别**：
- Symbol 是唯一的，避免命名冲突
- String 可能在大型项目中重复，导致注入错误
- Symbol 配合 interface 同名，语义更清晰

### Q3: 什么时候必须用 @Inject 装饰器？

只有以下情况需要：
1. 使用 Symbol Token（虽然默认注入也支持，但显式使用更清晰）
2. 参数类型无法推断（如 interface）
3. 需要注入特定的实现

```typescript
// 需要 @Inject 的情况
public constructor(
  @Inject(CONFIG_SERVICE_TOKEN) private config: ConfigService,
  @Inject(LOGGER_TOKEN) private logger: Logger,
) {}

// 不需要 @Inject（推荐）
public constructor(
  private readonly userService: UserService,
  private readonly productService: ProductService,
) {}
```

### Q4: exports 为什么导出实现类而不是 Symbol？

```typescript
@Module({
  providers: [{
    provide: UserService,      // Symbol Token
    useClass: UserServiceImpl,
  }],
  exports: [UserServiceImpl],  // 导出实现类
})
```

**原因**：
- `exports` 的作用是让其他模块可以导入该模块的 providers
- 导出的是 providers 数组中的元素（实现类）
- 其他模块通过 `imports` 导入后，可以使用 Symbol Token 注入

## 📚 相关资源

- [依赖注入指南](./guide.md#dependency-injection)
- [模块系统详解](./guide.md#module-system)
- [最佳实践](./best-practices.md)
- [示例代码](../examples/basic-app.ts)

---

**提示**：这个模式是 Bun Server Framework 的核心特性之一，理解它能帮助你更好地设计可维护的应用架构。
