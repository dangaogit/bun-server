# ORM 查询拦截器设计方案

> 日期：2026-03-17
> 状态：方案评估阶段

## 一、现状分析

### 1.1 当前 SQL 执行链路

```
Repository.findAll() / create() / update() / delete()
  → 手动拼接 SQL 字符串
  → BaseRepository.executeQuery(sql, params)
  → DatabaseService.query(sql, params)
  → getCurrentSession() 获取连接
  → 直接执行 SQL（无任何拦截点）
```

三条独立的 SQL 执行路径：

| 路径 | 入口 | 使用者 |
|---|---|---|
| 路径 A | `BaseRepository.executeQuery()` → `DatabaseService.query()` | Repository 模式用户 |
| 路径 B | `DatabaseService.query()` 直接调用 | Service 层手写 SQL 用户 |
| 路径 C | `` db`SELECT ...` `` → `BunSQLManager` | db proxy 用户 |

### 1.2 关键代码位置

| 组件 | 文件路径 |
|---|---|
| DatabaseService | `src/database/service.ts` |
| BaseRepository | `src/database/orm/repository.ts` |
| DrizzleBaseRepository | `src/database/orm/drizzle-repository.ts` |
| db proxy | `src/database/db-proxy.ts` |
| DatabaseModule | `src/database/database-module.ts` |
| OrmService | `src/database/orm/service.ts` |
| Entity/Column 装饰器 | `src/database/orm/decorators.ts` |
| Repository 装饰器 | `src/database/orm/repository-decorator.ts` |
| TransactionInterceptor | `src/database/orm/transaction-interceptor.ts` |
| TransactionManager | `src/database/orm/transaction-manager.ts` |
| BunSQLManager | `src/database/sql-manager.ts` |
| SqliteAdapter/Manager | `src/database/sqlite-adapter.ts` |
| DatabaseSession 上下文 | `src/database/database-context.ts` |

### 1.3 缺失的扩展点

| 缺失能力 | 说明 |
|---|---|
| SQL 拦截器链 | `DatabaseService.query()` 前后无 `beforeQuery` / `afterQuery` 钩子 |
| Repository 层钩子 | `BaseRepository.executeQuery()` 直接调用 service，无法注入自定义逻辑 |
| 查询构建管道 | SQL 全部手写字符串拼接，无 QueryBuilder 或 AST 抽象层 |
| 插件注册机制 | ORM 层无插件 API，无法通过 `DatabaseModule.forRoot` 注册拦截器 |

### 1.4 Drizzle 集成现状

Drizzle 在当前项目中**几乎没有实际集成**：

- `DrizzleBaseRepository` 全是 abstract 方法，零实现
- `OrmModuleOptions.drizzle` 类型是 `unknown`
- `package.json` 没有 drizzle 依赖
- `OrmService` 只是一个 drizzle 实例的容器，无查询逻辑

结论：**"与 Drizzle 重叠"是伪问题**，不存在真正需要兼容的 Drizzle 代码。

### 1.5 多租户现状

当前多租户策略是**连接级隔离**（每个租户一个独立数据库连接），不支持**行级隔离**（同库通过 `WHERE tenant_id = ?` 过滤）。

---

## 二、初筛方案（已淘汰）

### 方案 X1：DatabaseService.query() 拦截器链

在 `DatabaseService.query()` 中引入 `QueryInterceptor` 链。

- 覆盖路径 A + B，不覆盖路径 C（db proxy）
- 改动量小（~50 行）
- SQL 是原始字符串，复杂改写不安全
- 同步/异步混合签名增加复杂度

**淘汰原因**：字符串级操作不安全，路径 C 未覆盖。

### 方案 X2：BaseRepository.executeQuery() 钩子

在 `BaseRepository` 中暴露 `beforeExecute` / `afterExecute` 钩子。

- 仅覆盖路径 A
- 改动量最小（~40 行）
- SQL 仍是字符串
- 多 Repository 需逐个继承

**淘汰原因**：覆盖面最窄，仅 Repository 模式受益。

---

## 三、候选方案（升级方案，不考虑向下兼容）

### 方案 A：Kysely 接管查询层（推荐）

#### 核心思路

引入 Kysely 作为查询引擎，利用其原生 Plugin 系统实现拦截器。

#### 解决 db proxy 兼容

**路径 1 — 替代**：Kysely 自带 `sql` 模板标签，功能等价于当前 db proxy：

```typescript
// 旧 API
const users = await db`SELECT * FROM users WHERE id = ${id}`;

// 新 API（Kysely raw SQL）
const users = await db.execute(sql`SELECT * FROM users WHERE id = ${id}`);

// 新 API（QueryBuilder）
const users = await db.selectFrom('users').where('id', '=', id).execute();
```

**路径 2 — 融合**：保留 `db` 的模板字符串调用风格，底层替换为 Kysely 实例执行：

```typescript
// 用户代码不变
const users = await db`SELECT * FROM users`;

// 内部: db proxy → Kysely.executeRaw(sql, params) → Plugin chain → 执行
```

#### 解决 Drizzle 重叠

- 移除 `DrizzleBaseRepository`（空壳，无实际用户）
- 移除 `OrmService` 的 drizzle 相关代码
- Kysely 完全覆盖查询构建能力
- 用户如需 schema migration，可独立使用 Drizzle Kit CLI

#### 拦截器实现

Kysely 原生 `KyselyPlugin` 接口：

```typescript
interface KyselyPlugin {
  transformQuery(args: PluginTransformQueryArgs): RootOperationNode;
  transformResult(args: PluginTransformResultArgs): Promise<QueryResult<UnknownRow>>;
}
```

多租户拦截器示例：

```typescript
class TenantPlugin implements KyselyPlugin {
  transformQuery({ node }): RootOperationNode {
    // 在 AST 层面往所有 SELECT/UPDATE/DELETE 追加 WHERE tenant_id = ?
    // 在 INSERT 中自动注入 tenant_id 列
    return addTenantFilter(node, getCurrentTenantId());
  }
  transformResult({ result }) { return result; }
}
```

操作的是 AST 节点而非 SQL 字符串，安全可靠。

#### 需要的额外工作

- 编写 `BunSQLDialect`（适配 `Bun.SQL`）
- 编写 `BunSQLiteDialect`（适配 `bun:sqlite`）
- 重写 `BaseRepository` 使用 Kysely 查询

#### 评估

| 维度 | 评价 |
|---|---|
| 拦截器能力 | **最强** — 原生 AST 级插件，非字符串操作 |
| 开发量 | 中等（~3 天） |
| 新依赖 | 1 个（kysely，轻量） |
| 类型安全 | 强 — Kysely 天生类型安全 |
| 风险 | 低 — Kysely 成熟稳定，社区活跃 |

---

### 方案 B：Drizzle 深度集成

#### 核心思路

将 Drizzle 从 `unknown` 占位符升级为核心引擎，自建拦截层包裹 Drizzle 查询执行。

#### 解决 db proxy 兼容

`db` proxy 重定义为 Drizzle 实例的包装：

```typescript
// Drizzle QueryBuilder 风格
const users = await db.select().from(usersTable).where(eq(usersTable.id, 1));

// 原始 SQL 风格
const users = await db.execute(sql`SELECT * FROM users WHERE id = ${id}`);
```

#### 解决 Drizzle 重叠

不存在重叠 — Drizzle 就是唯一的查询层。`@Entity` / `@Column` 可保留为装饰器语法糖，也可废弃转向 Drizzle 原生 schema。

#### 拦截器实现

Drizzle 无原生插件系统，有两个技术路线：

**路线 1 — 自定义 Driver**：

```typescript
class InterceptableDriver implements Driver {
  async execute(query: Query): Promise<Result> {
    let { sql, params } = query;
    for (const interceptor of this.interceptors) {
      ({ sql, params } = interceptor.beforeQuery(sql, params, context));
    }
    return this.realDriver.execute({ sql, params });
  }
}
```

**路线 2 — Proxy 包裹 Drizzle 实例**：用 Proxy 拦截所有查询方法。

两种路线的问题：Drizzle 在 Driver 层已编译为 SQL 字符串，拦截器仍然是字符串级操作。

#### 评估

| 维度 | 评价 |
|---|---|
| 拦截器能力 | 中等 — Driver 层拦截是字符串级别，非 AST |
| 开发量 | 中大（~4 天） |
| 新依赖 | 1 个（drizzle-orm，较重） |
| 类型安全 | 最强 — Drizzle 类型推导业界领先 |
| 风险 | 中 — 拦截器实现依赖 Drizzle 内部结构 |
| 额外收益 | migration / studio / schema push 生态 |

---

### 方案 C：零依赖自研查询协议

#### 核心思路

定义框架自有的 `QueryIntent` 结构化查询描述，拦截器在对象层面修改查询，最终编译为 SQL。

#### 核心设计

```typescript
interface QueryIntent {
  type: 'select' | 'insert' | 'update' | 'delete';
  table: string;
  columns?: string[];
  where?: WhereClause[];
  joins?: JoinClause[];
  values?: Record<string, unknown>;
  orderBy?: OrderByClause[];
  limit?: number;
  offset?: number;
  raw?: { sql: string; params: unknown[] };  // 原始 SQL 逃生舱
}

interface QueryInterceptor {
  intercept(intent: QueryIntent, context: QueryContext): QueryIntent;
}
```

#### 解决 db proxy 兼容

`db` proxy 模板字符串调用产出 `raw` 类型的 QueryIntent：

```typescript
// 用户写法不变
const users = await db`SELECT * FROM users WHERE id = ${id}`;

// 内部流程:
// 1. 解析模板字符串 → QueryIntent { raw: { sql, params } }
// 2. 过拦截器链
// 3. 编译执行
```

同时提供结构化 API：

```typescript
const users = await db.from('users').where('id', '=', id).select();
```

#### 解决 Drizzle 重叠

完全移除 Drizzle 相关代码，框架自主可控。

#### 拦截器实现

```typescript
class TenantInterceptor implements QueryInterceptor {
  intercept(intent: QueryIntent, ctx: QueryContext): QueryIntent {
    if (intent.raw) {
      return { ...intent, raw: appendTenantFilter(intent.raw, ctx.tenantId) };
    }
    return {
      ...intent,
      where: [...(intent.where ?? []), { column: 'tenant_id', op: '=', value: ctx.tenantId }],
    };
  }
}
```

#### 评估

| 维度 | 评价 |
|---|---|
| 拦截器能力 | 高 — 结构化查询是 AST 级；raw SQL 退化为字符串级 |
| 开发量 | 大（~5-7 天） |
| 新依赖 | 0 |
| 类型安全 | 中 — 需额外投入 |
| 风险 | 中 — QueryBuilder 完备性需打磨 |
| 额外收益 | 架构完全自主，未来可对接任意后端 |

---

## 四、三方案横向对比

| 维度 | A. Kysely | B. Drizzle | C. 自研 |
|---|---|---|---|
| **拦截器级别** | AST 原生 | SQL 字符串（Driver 层） | 结构化对象 + raw 退化 |
| **db proxy 方案** | 替代或融合均可 | 重定义为 Drizzle 包装 | 保留风格，内部走协议 |
| **Drizzle 处理** | 移除（空壳） | 升级为核心 | 移除 |
| **新增依赖** | kysely（轻量） | drizzle-orm（较重） | 无 |
| **类型安全** | 强 | 最强 | 需额外投入 |
| **拦截器实现难度** | 低（原生支持） | 中（需 hack） | 中（需自建） |
| **生态/附加能力** | 纯查询 | migration/studio | 无 |
| **总开发量** | ~3 天 | ~4 天 | ~5-7 天 |
| **长期维护成本** | 低 | 中 | 高 |

---

## 五、待清理的遗留代码

无论选择哪个方案，以下代码应当移除或重构：

| 文件 | 处理方式 |
|---|---|
| `src/database/orm/drizzle-repository.ts` | 移除（空壳，全 abstract） |
| `src/database/orm/service.ts` | 移除或重构（仅是 drizzle 实例容器） |
| `src/database/orm/types.ts` 中 `OrmModuleOptions.drizzle` | 移除 |
| `src/database/service.ts` 中 `DatabaseService.query()` | 重构为走新查询引擎 |
| `src/database/db-proxy.ts` | 重构底层执行路径 |
| `src/database/orm/repository.ts` 中手写 SQL | 重构为查询构建器 |

---

## 六、实施建议

### 推荐：方案 A（Kysely）

理由：
1. 原生 AST 级 Plugin 是为拦截器场景设计的，不需要任何 hack
2. Kysely 足够轻量（纯查询构建器），与框架"Bun 原生、轻量"定位一致
3. 开发量适中，风险低
4. 社区活跃，Bun 兼容性好

### 实施步骤（草案）

1. **Phase 1 — 基础设施**
   - 引入 kysely 依赖
   - 编写 BunSQLDialect（适配 Bun.SQL）
   - 编写 BunSQLiteDialect（适配 bun:sqlite）
   - 在 DatabaseModule 中创建 Kysely 实例

2. **Phase 2 — 查询层迁移**
   - 重写 BaseRepository 使用 Kysely 查询
   - 重构 db proxy 底层走 Kysely 执行
   - 移除 DrizzleBaseRepository、OrmService 的 drizzle 代码

3. **Phase 3 — 拦截器体系**
   - 定义 QueryPlugin 接口（包装 KyselyPlugin）
   - 实现 TenantPlugin（多租户行级过滤）
   - 在 DatabaseModule.forRoot() 中支持 plugins 配置
   - 编写示例和文档

4. **Phase 4 — 清理和测试**
   - 移除遗留代码
   - 编写单元测试
   - 更新示例应用
   - 更新文档
