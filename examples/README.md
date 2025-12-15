# 示例项目

| 文件                   | 说明                                                                    | 运行方式                                | 端口 |
| ---------------------- | ----------------------------------------------------------------------- | --------------------------------------- | ---- |
| `basic-app.ts`         | 最小可运行示例，包含 DI、控制器与验证                                   | `bun run examples/basic-app.ts`         | 3100 |
| `full-app.ts`          | 综合示例，集成日志、CORS、上传、静态资源与 WebSocket                    | `bun run examples/full-app.ts`          | 3200 |
| `cache-app.ts`         | 缓存示例，演示 CacheModule 的使用（@Cacheable, @CacheEvict, @CachePut） | `bun run examples/cache-app.ts`         | 3200 |
| `queue-app.ts`         | 队列示例，演示 QueueModule 的使用（任务队列、Cron 定时任务）            | `bun run examples/queue-app.ts`         | 3300 |
| `session-app.ts`       | Session 示例，演示 SessionModule 的使用（登录、购物车）                 | `bun run examples/session-app.ts`       | 3400 |
| `context-scope-app.ts` | ContextService + 请求作用域示例，演示 `ContextService` / `@Context()` / `Lifecycle.Scoped` | `bun run examples/context-scope-app.ts` | 3500 |
| `database-test-app.ts` | 数据库测试工具，Web UI 界面测试 PostgreSQL/MySQL 连接                   | `bun run examples/database-test-app.ts` | 3000 |
| `perf/app.ts`          | 性能压测示例，暴露 `/api/ping` 供 wrk 等工具测试                        | `bun run examples/perf/app.ts`          | 3300 |

> 运行前请确保 `bun install` 已完成依赖安装。示例默认监听不同端口，可通过设置
> `PORT` 环境变量覆盖（例如 `PORT=0 bun run ...` 交由系统分配端口）。

## 额外示例片段：QueryMap / HeaderMap

> 片段可直接嵌入到你的控制器中使用，无需单独运行文件。

```ts
import { Controller, GET, QueryMap, HeaderMap } from '@dangao/bun-server';

@Controller('/api/search')
class SearchController {
  @GET('/')
  public list(
    @QueryMap() query: Record<string, string | string[]>, // 聚合 query，重复 key 变数组
    @HeaderMap({ pick: ['x-token'] }) headers: Record<string, string | string[]>, // 只取部分 header
  ) {
    return { query, headers };
  }
}
```

## 常用命令

```bash
# 基础示例
bun run examples/basic-app.ts

# 全功能示例
bun run examples/full-app.ts

# 缓存示例
bun run examples/cache-app.ts

# 队列示例
bun run examples/queue-app.ts

# Session 示例
bun run examples/session-app.ts

# 数据库测试工具
bun run examples/database-test-app.ts

# 性能测试
bun run examples/perf/app.ts
wrk -t4 -c64 -d30s http://localhost:3300/api/ping
```

## 示例说明

### CacheModule 示例 (`cache-app.ts`)

演示缓存功能的使用：

- **装饰器方式**：使用 `@Cacheable`、`@CacheEvict`、`@CachePut`
  装饰器自动缓存方法结果
- **手动方式**：直接使用 `CacheService` 进行缓存操作
- **缓存策略**：演示缓存命中、缓存更新、缓存清除等场景

### QueueModule 示例 (`queue-app.ts`)

演示任务队列功能的使用：

- **任务队列**：将耗时操作（如发送邮件）放入队列异步处理
- **任务处理器**：注册任务处理器处理队列中的任务
- **定时任务**：使用 Cron 表达式创建定时任务（每日报告、清理任务等）
- **优先级**：演示任务优先级设置

### SessionModule 示例 (`session-app.ts`)

演示 Session 管理功能的使用：

- **登录/登出**：创建和销毁 Session
- **Session 数据**：存储和读取用户数据（如购物车）
- **Session 中间件**：自动处理 Session Cookie
- **Session 装饰器**：使用 `@Session()` 装饰器注入 Session 对象

### 数据库测试工具 (`database-test-app.ts`)

提供 Web UI 界面，用于测试 PostgreSQL 和 MySQL 数据库连接：

- **连接管理**：手动填写数据库连接信息（主机、端口、数据库名、用户名、密码）
- **功能检查**：
  - ✅ 连接测试：验证数据库连接是否正常
  - 📊 查询测试：执行测试查询，验证查询功能
  - 🔄 事务测试：测试事务回滚功能
  - 🏥 健康检查：检查数据库连接健康状态
  - 📈 连接池统计：查看连接池使用情况
  - ❌ 断开连接：关闭数据库连接

访问 `http://localhost:3000` 使用 Web UI 界面进行数据库连接测试。

所有示例都会在控制台输出服务地址和可用端点，按需调整端口或中间件配置即可。
