# @dangao/bun-server 数据库迁移工具功能请求

## 问题描述

当前 `@dangao/bun-server` 框架缺少数据库迁移工具，开发者需要手动管理数据库
schema 变更。这导致以下问题：

1. **无法版本化数据库变更**：缺少统一的数据库版本管理机制
2. **手动管理迁移脚本**：开发者需要手动编写和执行 SQL 迁移脚本
3. **缺少回滚支持**：无法方便地回滚数据库变更
4. **团队协作困难**：不同开发环境的数据库状态难以同步

## 功能需求

### 1. MigrationModule 实现

框架应提供 `MigrationModule`，支持数据库迁移管理。

**期望实现**：

```typescript
MigrationModule.forRoot({
  migrationsDir: "./migrations",
  database: {
    type: "postgres",
    config: {/* ... */},
  },
});
```

### 2. 迁移文件管理

框架应支持迁移文件的创建、管理和执行。

**期望实现**：

```typescript
// migrations/20240101000000_create_users_table.ts
export async function up(db: DatabaseService) {
  await db.query(`
    CREATE TABLE users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

export async function down(db: DatabaseService) {
  await db.query("DROP TABLE users;");
}
```

### 3. 迁移 CLI 工具

框架应提供 CLI 工具管理迁移。

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

### 4. 版本控制

框架应支持迁移版本管理和状态跟踪。

**期望实现**：

- 自动创建 `migrations` 表记录迁移历史
- 支持迁移版本号管理
- 支持迁移状态查询

### 5. 回滚支持

框架应支持迁移回滚功能。

**期望实现**：

- 支持单次回滚（回滚最后一次迁移）
- 支持回滚到指定版本
- 支持回滚所有迁移

## 详细设计

### MigrationModule 结构

```typescript
@Module({
  providers: [MigrationService],
})
export class MigrationModule {
  public static forRoot(
    options: MigrationModuleOptions,
  ): typeof MigrationModule {
    // 注册 MigrationService
    // 配置迁移目录和数据库连接
  }
}
```

### MigrationService 接口

```typescript
export interface MigrationService {
  /**
   * 运行所有待执行的迁移
   */
  up(): Promise<void>;

  /**
   * 回滚最后一次迁移
   */
  down(): Promise<void>;

  /**
   * 回滚到指定版本
   */
  downTo(version: string): Promise<void>;

  /**
   * 查看迁移状态
   */
  status(): Promise<MigrationStatus[]>;
}
```

### 迁移文件格式

```typescript
export interface Migration {
  version: string;
  name: string;
  up: (db: DatabaseService) => Promise<void>;
  down: (db: DatabaseService) => Promise<void>;
}
```

## 实现检查清单

### MigrationModule 实现

- [ ] 实现 `MigrationModule` 类
- [ ] 实现 `MigrationService` 类
- [ ] 迁移文件加载和解析
- [ ] 迁移执行逻辑

### 迁移 CLI 工具

- [ ] 创建迁移文件命令
- [ ] 运行迁移命令
- [ ] 回滚迁移命令
- [ ] 查看状态命令

### 版本控制

- [ ] 迁移版本号生成
- [ ] 迁移历史表创建
- [ ] 迁移状态跟踪

### 文档和测试

- [ ] 更新数据库文档
- [ ] 添加迁移使用示例
- [ ] 添加单元测试和集成测试

## 相关文件

### MigrationModule 相关

- `src/database/migration/migration-module.ts` - MigrationModule 实现
- `src/database/migration/migration-service.ts` - MigrationService 实现
- `src/database/migration/types.ts` - 迁移相关类型定义
- `src/database/migration/cli.ts` - CLI 工具实现

## 优先级

**中优先级** - 这是数据库功能的重要补充，能够提升开发体验和团队协作效率。
