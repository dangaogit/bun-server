# Symbol + Interface Same-Name Pattern Explained

## 📖 Background

After TypeScript is compiled to JavaScript, all type information is lost. This poses a challenge for dependency injection frameworks: how to identify the type of injected dependencies at runtime?

## 🎯 Solution

Bun Server Framework adopts the **Symbol + Interface Same-Name Pattern** to elegantly solve this problem.

## 💡 Core Concepts

### Problems with Traditional Approach

```typescript
// ❌ Traditional approach: can only inject concrete classes
interface UserService {
  find(id: string): Promise<User>;
}

@Injectable()
class UserServiceImpl implements UserService {
  async find(id: string) { ... }
}

// Problem: TypeScript interfaces disappear after compilation
// Cannot inject using interface type at runtime
public constructor(
  private readonly userService: UserService  // Type information lost after compilation
) {}
```

### Symbol + Interface Same-Name Pattern

```typescript
// ✅ Bun Server approach: Symbol + Interface same name

// 1. Define interface (compile-time type checking)
interface UserService {
  find(id: string): Promise<User>;
  create(user: User): Promise<User>;
}

// 2. Define same-name Symbol (runtime Token)
// Note: declared as const, same name as interface
const UserService = Symbol('UserService');

// 3. Implement interface
@Injectable()
class UserServiceImpl implements UserService {
  public async find(id: string): Promise<User> {
    // Implementation...
  }
  
  public async create(user: User): Promise<User> {
    // Implementation...
  }
}

// 4. Configure in Module
@Module({
  providers: [{
    provide: UserService,      // Symbol Token (runtime)
    useClass: UserServiceImpl, // Implementation class
  }],
  exports: [UserServiceImpl],  // Export implementation class (optional)
})
class UserModule {}

// 5. Inject and use
@Controller('/users')
class UserController {
  public constructor(
    // Type is interface UserService (compile-time check)
    // Actually injected is instance corresponding to Symbol('UserService') (runtime)
    private readonly userService: UserService,
  ) {}
  
  @GET('/:id')
  public async getUser(@Param('id') id: string) {
    // TypeScript knows userService has find method
    return await this.userService.find(id);
  }
}
```

## 🔑 Key Points

### 1. Cannot Use `import type` When Importing

```typescript
// ✅ Correct: Import both Symbol and interface
import { UserService } from './user-service';

// ❌ Wrong: Only import type, Symbol is lost
import type { UserService } from './user-service';

// ❌ Wrong: Mixed import causes confusion
import { type UserService } from './user-service';
```

**Reason**: `import type` only imports type information, which is completely removed after compilation, causing the Symbol to be lost.

### 2. Export Order

```typescript
// Recommended file organization

// user-service.ts
// 1. Import dependencies
import { Injectable } from '@dangao/bun-server';

// 2. Define interface
export interface UserService {
  find(id: string): Promise<User>;
}

// 3. Define Symbol (same name as interface)
export const UserService = Symbol('UserService');

// 4. Implementation class
@Injectable()
export class UserServiceImpl implements UserService {
  public async find(id: string): Promise<User> {
    // ...
  }
}
```

### 3. Module Configuration

```typescript
@Module({
  providers: [
    {
      provide: UserService,      // Use Symbol as Token
      useClass: UserServiceImpl, // Specify implementation class
    }
  ],
  exports: [UserServiceImpl],    // Export implementation class (for other modules to use)
})
class UserModule {}
```

**Note**:
- `provide` uses Symbol Token
- `exports` exports implementation class (not Symbol)

### 4. Constructor Injection

```typescript
// ✅ Recommended: Default injection (no decorator needed)
public constructor(
  private readonly userService: UserService,  // Framework automatically recognizes type
) {}

// ⚠️ Only use @Inject in the following cases
public constructor(
  @Inject(UserService) private readonly userService: UserService,
) {}
```

## 📋 Complete Example

### Step 1: Define Service Interface and Implementation

```typescript
// src/user/user-service.ts

import { Injectable } from '@dangao/bun-server';

// 1. Define user entity
export interface User {
  id: string;
  name: string;
  email: string;
}

// 2. Define service interface
export interface UserService {
  find(id: string): Promise<User | undefined>;
  create(name: string, email: string): Promise<User>;
  findAll(): Promise<User[]>;
}

// 3. Define same-name Symbol
export const UserService = Symbol('UserService');

// 4. Implement service
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

### Step 2: Create Controller

```typescript
// src/user/user-controller.ts

import { Controller, GET, POST, Body, Param } from '@dangao/bun-server';
// ✅ Note: Don't use import type
import { UserService } from './user-service';

@Controller('/api/users')
export class UserController {
  // Constructor injection, framework automatically recognizes type
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

### Step 3: Configure Module

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
      useClass: UserServiceImpl, // Implementation class
    }
  ],
  exports: [UserServiceImpl],    // Export for other modules to use
})
export class UserModule {}
```

### Step 4: Start Application

```typescript
// src/main.ts

import { Application } from '@dangao/bun-server';
import { UserModule } from './user/user-module';

const app = new Application({ port: 3000 });
app.registerModule(UserModule);
app.listen();

console.log('Server running on http://localhost:3000');
```

## 🎨 Advanced Usage

### Multiple Implementation Switching

```typescript
// Define interface and Symbol
export interface CacheService {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
}
export const CacheService = Symbol('CacheService');

// Memory implementation
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

// Redis implementation
@Injectable()
export class RedisCacheService implements CacheService {
  async get(key: string) {
    // Redis implementation...
  }
  
  async set(key: string, value: string) {
    // Redis implementation...
  }
}

// Switch implementation based on environment
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

### Factory Function

```typescript
// Use factory function to create instances
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

## ❓ Common Questions

### Q1: Why Not Use Classes Directly as Tokens?

**A**: Using classes as tokens has the following problems:
1. Cannot implement interface-oriented programming
2. Tight coupling to implementation classes, not conducive to testing
3. Cannot dynamically switch implementations at runtime

The Symbol + Interface pattern provides better flexibility.

### Q2: What's the Difference Between Symbol and String Tokens?

```typescript
// Symbol Token (recommended)
const UserService = Symbol('UserService');

// String Token (not recommended)
const USER_SERVICE_TOKEN = 'UserService';
```

**Differences**:
- Symbol is unique, avoiding naming conflicts
- String may be duplicated in large projects, causing injection errors
- Symbol combined with same-name interface provides clearer semantics

### Q3: When Must @Inject Decorator Be Used?

Only needed in the following cases:
1. Using Symbol Token (although default injection also supports it, explicit use is clearer)
2. Parameter type cannot be inferred (e.g., interface)
3. Need to inject specific implementation

```typescript
// Cases requiring @Inject
public constructor(
  @Inject(CONFIG_SERVICE_TOKEN) private config: ConfigService,
  @Inject(LOGGER_TOKEN) private logger: Logger,
) {}

// No @Inject needed (recommended)
public constructor(
  private readonly userService: UserService,
  private readonly productService: ProductService,
) {}
```

### Q4: Why Does exports Export Implementation Classes Instead of Symbols?

```typescript
@Module({
  providers: [{
    provide: UserService,      // Symbol Token
    useClass: UserServiceImpl,
  }],
  exports: [UserServiceImpl],  // Export implementation class
})
```

**Reason**:
- The purpose of `exports` is to allow other modules to import this module's providers
- What's exported are elements from the providers array (implementation classes)
- After other modules import through `imports`, they can use Symbol Token for injection

## 📚 Related Resources

- [Dependency Injection Guide](./guide.md#dependency-injection)
- [Module System Explained](./guide.md#module-system)
- [Best Practices](./best-practices.md)
- [Example Code](../examples/basic-app.ts)

---

**Tip**: This pattern is one of the core features of Bun Server Framework. Understanding it will help you design more maintainable application architectures.
