# @dangao/bun-server CLI 工具功能请求

## 问题描述

当前 `@dangao/bun-server` 框架缺少 CLI 工具，开发者需要手动创建项目结构、生成代码和管理数据库迁移。这导致以下问题：

1. **项目初始化繁琐**：需要手动创建项目结构和配置文件
2. **代码生成效率低**：需要手动编写 Controller、Service、Module 等模板代码
3. **缺少统一工具**：不同开发者可能使用不同的项目结构和代码风格

## 功能需求

### 1. 项目脚手架（`bun-server new`）

框架应提供项目脚手架工具，快速创建新项目。

**期望实现**：

```bash
bun-server new my-project

# 交互式选择模块
? Select modules: (Press <space> to select)
  ◯ ConfigModule
  ◯ LoggerModule
  ◯ SwaggerModule
  ◯ DatabaseModule
  ◯ CacheModule
  ◯ QueueModule
  ◯ SessionModule
```

**生成的项目结构**：

```
my-project/
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── controllers/
│   ├── services/
│   └── entities/
├── tests/
├── package.json
├── tsconfig.json
└── readme.md
```

### 2. 代码生成器（`bun-server generate`）

框架应提供代码生成器，快速生成常用代码模板。

**期望实现**：

```bash
# 生成 Controller
bun-server generate controller UserController

# 生成 Service
bun-server generate service UserService

# 生成 Module
bun-server generate module UserModule

# 生成 Entity
bun-server generate entity User
```

**生成的代码示例**：

```typescript
// 生成 Controller
@Controller('/api/users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @GET()
  async findAll() {
    return await this.userService.findAll();
  }

  @GET('/:id')
  async findOne(@Param('id') id: string) {
    return await this.userService.findOne(id);
  }
}
```

### 3. 数据库迁移 CLI（`bun-server migrate`）

框架应提供数据库迁移 CLI 工具。

**期望实现**：

```bash
# 创建迁移文件
bun-server migrate create create_users_table

# 运行迁移
bun-server migrate up

# 回滚迁移
bun-server migrate down

# 查看迁移状态
bun-server migrate status
```

## 详细设计

### CLI 工具结构

```
packages/
└── bun-server-cli/          # CLI 工具包（新建）
    ├── package.json          # 包名：@dangao/bun-server-cli
    ├── src/
    │   ├── commands/
    │   │   ├── new.ts        # 项目脚手架命令
    │   │   ├── generate.ts   # 代码生成命令
    │   │   └── migrate.ts    # 迁移命令
    │   ├── templates/        # 代码模板
    │   └── index.ts         # CLI 入口
    └── bin/
        └── bun-server        # CLI 可执行文件
```

### 命令设计

```typescript
// CLI 命令接口
export interface Command {
  name: string;
  description: string;
  options?: Option[];
  action: (args: string[], options: Record<string, unknown>) => Promise<void>;
}
```

## 实现检查清单

### 项目脚手架实现

- [ ] 实现 `new` 命令
- [ ] 交互式模块选择
- [ ] 项目模板生成
- [ ] 配置文件生成

### 代码生成器实现

- [ ] 实现 `generate` 命令
- [ ] Controller 模板生成
- [ ] Service 模板生成
- [ ] Module 模板生成
- [ ] Entity 模板生成

### 数据库迁移 CLI 实现

- [ ] 实现 `migrate` 命令
- [ ] 创建迁移文件
- [ ] 运行迁移
- [ ] 回滚迁移
- [ ] 查看状态

### 文档和测试

- [ ] CLI 工具使用文档
- [ ] 代码生成示例
- [ ] 单元测试

## 相关文件

### CLI 工具相关

- `packages/bun-server-cli/` - CLI 工具包（新建）
- `packages/bun-server-cli/src/commands/` - 命令实现
- `packages/bun-server-cli/src/templates/` - 代码模板

## 优先级

**中优先级** - 这是开发体验的重要提升，能够显著提高开发效率。

