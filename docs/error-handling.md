# 错误处理指南

本文档介绍 Bun Server Framework
的错误处理系统，包括错误码规范、国际化支持和最佳实践。

## 目录

- [错误码系统](#错误码系统)
- [错误消息国际化](#错误消息国际化)
- [异常过滤器](#异常过滤器)
- [最佳实践](#最佳实践)
- [示例代码](#示例代码)

---

## 错误码系统

### 错误码规范

错误码采用统一的命名规范：

- **格式**：`模块_错误类型_具体错误`
- **使用大写字母和下划线**
- **模块前缀**：
  - `AUTH` - 认证和授权
  - `VALIDATION` - 验证
  - `DATABASE` - 数据库
  - `FILE` - 文件操作
  - `MIDDLEWARE` - 中间件
  - `OAUTH2` - OAuth2
  - `CONFIG` - 配置

**示例**：

- `AUTH_INVALID_TOKEN` - 无效的认证令牌
- `VALIDATION_REQUIRED_FIELD` - 必填字段缺失
- `DATABASE_CONNECTION_FAILED` - 数据库连接失败

### 错误码分类

错误码按功能模块分类，每个分类对应一个数字范围：

- **1000-1999**: 通用错误
- **2000-2999**: 认证和授权错误
- **3000-3999**: 验证错误
- **4000-4999**: OAuth2 错误
- **5000-5999**: 数据库错误
- **6000-6999**: 文件操作错误
- **7000-7999**: 中间件错误
- **8000-8999**: 配置错误

### 使用错误码

```typescript
import { ErrorCode, HttpException } from "@dangao/bun-server";

// 方式 1: 使用 HttpException.withCode()
throw HttpException.withCode(ErrorCode.RESOURCE_NOT_FOUND);

// 方式 2: 使用带错误码的异常类
throw new NotFoundException(
  "User not found",
  undefined,
  ErrorCode.RESOURCE_NOT_FOUND,
);

// 方式 3: 带自定义消息和详情
throw HttpException.withCode(
  ErrorCode.VALIDATION_FAILED,
  "Custom validation message",
  { field: "email", reason: "Invalid format" },
);
```

---

## 错误消息国际化

### 支持的语言

框架支持以下语言：

- `en` - 英语（默认）
- `zh-CN` - 简体中文
- `ja` - 日语（部分）
- `ko` - 韩语（部分）

### 自动语言检测

框架会根据 HTTP 请求头 `Accept-Language` 自动检测用户语言：

```typescript
// 请求头示例
Accept-Language: zh-CN,zh;q=0.9,en;q=0.8
```

### 消息模板系统

错误消息支持模板参数，使用 `{key}` 作为占位符：

```typescript
import { ErrorCode, HttpException } from "@dangao/bun-server";

// 如果错误消息模板是 'Resource {resource} not found'
throw HttpException.withCode(
  ErrorCode.RESOURCE_NOT_FOUND,
  undefined,
  undefined,
  { resource: "User" }, // 消息模板参数
);
// 返回: 'Resource User not found' (英文) 或 '资源 User 未找到' (中文)
```

### 手动设置语言

```typescript
import { ErrorMessageI18n } from "@dangao/bun-server";

// 设置全局语言
ErrorMessageI18n.setLanguage("zh-CN");

// 获取指定语言的错误消息
const message = ErrorMessageI18n.getMessage(
  ErrorCode.RESOURCE_NOT_FOUND,
  "zh-CN",
  { resource: "User" },
);
```

---

## 异常过滤器

异常过滤器允许你自定义错误处理逻辑，可以针对特定异常类型或错误码进行处理。

### 创建异常过滤器

```typescript
import type { ExceptionFilter } from "@dangao/bun-server";
import type { Context } from "@dangao/bun-server";
import { ErrorCode, HttpException } from "@dangao/bun-server";

class CustomExceptionFilter implements ExceptionFilter {
  public catch(error: unknown, context: Context): Response | undefined {
    if (
      error instanceof HttpException &&
      error.code === ErrorCode.DATABASE_CONNECTION_FAILED
    ) {
      // 自定义数据库连接错误的处理
      context.setStatus(503);
      return context.createResponse({
        error: "Database service temporarily unavailable",
        code: error.code,
        retryAfter: 60, // 建议 60 秒后重试
      });
    }

    // 返回 undefined 表示不处理，继续交给下一个过滤器
    return undefined;
  }
}
```

### 注册异常过滤器

```typescript
import { ExceptionFilterRegistry } from "@dangao/bun-server";

const registry = ExceptionFilterRegistry.getInstance();
registry.register(new CustomExceptionFilter());
```

### 过滤器执行顺序

异常过滤器按照注册顺序执行，第一个返回非 `undefined` 结果的过滤器会被使用。

---

## 最佳实践

### 1. 使用错误码

**推荐** ✅：

```typescript
throw HttpException.withCode(ErrorCode.RESOURCE_NOT_FOUND);
```

**不推荐** ❌：

```typescript
throw new Error("Resource not found");
```

### 2. 提供错误详情

对于验证错误，提供详细的错误信息：

```typescript
throw HttpException.withCode(
  ErrorCode.VALIDATION_FAILED,
  "Validation failed",
  {
    field: "email",
    reason: "Invalid email format",
    value: userInput.email,
  },
);
```

### 3. 使用消息模板参数

对于需要动态信息的错误消息，使用消息模板参数：

```typescript
throw HttpException.withCode(
  ErrorCode.RESOURCE_NOT_FOUND,
  undefined,
  undefined,
  { resource: "User", id: userId },
);
```

### 4. 自定义异常过滤器

对于需要特殊处理的错误，使用异常过滤器：

```typescript
class DatabaseExceptionFilter implements ExceptionFilter {
  public catch(error: unknown, context: Context): Response | undefined {
    if (
      error instanceof HttpException &&
      error.code?.startsWith("DATABASE_")
    ) {
      // 统一处理所有数据库错误
      return context.createResponse({
        error: "Database error occurred",
        code: error.code,
        timestamp: new Date().toISOString(),
      });
    }
    return undefined;
  }
}
```

### 5. 生产环境错误处理

在生产环境中，避免暴露敏感信息：

```typescript
// 错误处理器会自动处理
// 在生产环境中，非 HttpException 的错误不会暴露详细信息
if (process.env.NODE_ENV === "production") {
  // 只返回通用错误消息
  return context.createResponse({
    error: "Internal Server Error",
  });
}
```

### 6. 错误日志记录

在异常过滤器中记录错误日志：

```typescript
class LoggingExceptionFilter implements ExceptionFilter {
  public catch(error: unknown, context: Context): Response | undefined {
    // 记录错误日志
    console.error("Error occurred:", {
      error,
      path: context.getPath(),
      method: context.getMethod(),
      timestamp: new Date().toISOString(),
    });

    return undefined; // 继续交给下一个过滤器
  }
}
```

---

## 示例代码

### 完整的错误处理示例

```typescript
import {
  Application,
  type Context,
  Controller,
  ErrorCode,
  ExceptionFilter,
  ExceptionFilterRegistry,
  GET,
  HttpException,
  Param,
} from "@dangao/bun-server";

// 1. 创建自定义异常过滤器
class ApiExceptionFilter implements ExceptionFilter {
  public catch(error: unknown, context: Context): Response | undefined {
    if (error instanceof HttpException) {
      // 添加请求 ID 和时间戳
      return context.createResponse({
        error: error.message,
        code: error.code,
        details: error.details,
        requestId: context.getHeader("x-request-id"),
        timestamp: new Date().toISOString(),
      });
    }
    return undefined;
  }
}

// 2. 注册异常过滤器
const registry = ExceptionFilterRegistry.getInstance();
registry.register(new ApiExceptionFilter());

// 3. 在控制器中使用错误码
@Controller("/api/users")
class UserController {
  @GET("/:id")
  public async getUser(@Param("id") id: string) {
    const userId = parseInt(id, 10);

    if (isNaN(userId)) {
      throw HttpException.withCode(
        ErrorCode.VALIDATION_INVALID_FORMAT,
        "Invalid user ID format",
        { field: "id", value: id },
      );
    }

    const user = await this.userService.findById(userId);

    if (!user) {
      throw HttpException.withCode(
        ErrorCode.RESOURCE_NOT_FOUND,
        undefined,
        undefined,
        { resource: "User", id: userId },
      );
    }

    return user;
  }
}

// 4. 启动应用
const app = new Application();
app.registerController(UserController);
app.listen();
```

### 数据库错误处理示例

```typescript
import { ErrorCode, HttpException } from "@dangao/bun-server";

try {
  await database.query("SELECT * FROM users WHERE id = ?", [userId]);
} catch (error) {
  if (error.code === "SQLITE_ERROR") {
    throw HttpException.withCode(
      ErrorCode.DATABASE_QUERY_FAILED,
      "Failed to query user",
      { sql: error.sql, params: [userId] },
    );
  }
  throw error;
}
```

### 验证错误处理示例

```typescript
import { ErrorCode, HttpException } from "@dangao/bun-server";

if (!email || !isValidEmail(email)) {
  throw HttpException.withCode(
    ErrorCode.VALIDATION_INVALID_FORMAT,
    "Invalid email format",
    {
      field: "email",
      value: email,
      expected: "valid email address",
    },
  );
}
```

---

## 错误码参考

### 通用错误 (1000-1999)

- `INTERNAL_ERROR` - 服务器内部错误
- `INVALID_REQUEST` - 无效的请求
- `RESOURCE_NOT_FOUND` - 资源未找到
- `METHOD_NOT_ALLOWED` - 方法不允许
- `RATE_LIMIT_EXCEEDED` - 请求频率超限
- `SERVICE_UNAVAILABLE` - 服务不可用
- `TIMEOUT` - 请求超时

### 认证和授权错误 (2000-2999)

- `AUTH_REQUIRED` - 需要认证
- `AUTH_INVALID_TOKEN` - 无效的认证令牌
- `AUTH_TOKEN_EXPIRED` - 认证令牌已过期
- `AUTH_INSUFFICIENT_PERMISSIONS` - 权限不足
- `AUTH_INVALID_CREDENTIALS` - 无效的凭据
- `AUTH_ACCOUNT_LOCKED` - 账户已锁定
- `AUTH_ACCOUNT_DISABLED` - 账户已禁用

### 验证错误 (3000-3999)

- `VALIDATION_FAILED` - 验证失败
- `VALIDATION_REQUIRED_FIELD` - 必填字段缺失
- `VALIDATION_INVALID_FORMAT` - 格式无效
- `VALIDATION_OUT_OF_RANGE` - 值超出范围
- `VALIDATION_TYPE_MISMATCH` - 类型不匹配
- `VALIDATION_CONSTRAINT_VIOLATION` - 约束违反

### 数据库错误 (5000-5999)

- `DATABASE_CONNECTION_FAILED` - 数据库连接失败
- `DATABASE_QUERY_FAILED` - 数据库查询失败
- `DATABASE_TRANSACTION_FAILED` - 数据库事务失败
- `DATABASE_CONSTRAINT_VIOLATION` - 数据库约束违反
- `DATABASE_TIMEOUT` - 数据库超时
- `DATABASE_POOL_EXHAUSTED` - 数据库连接池耗尽
- `DATABASE_MIGRATION_FAILED` - 数据库迁移失败

### 文件操作错误 (6000-6999)

- `FILE_NOT_FOUND` - 文件未找到
- `FILE_UPLOAD_FAILED` - 文件上传失败
- `FILE_DOWNLOAD_FAILED` - 文件下载失败
- `FILE_SIZE_EXCEEDED` - 文件大小超限
- `FILE_TYPE_NOT_ALLOWED` - 不允许的文件类型
- `FILE_ACCESS_DENIED` - 文件访问被拒绝
- `FILE_PATH_TRAVERSAL` - 检测到路径遍历攻击

完整的错误码列表请参考 `src/error/error-codes.ts`。

---

## 相关资源

- [API 文档](./api.md)
- [使用指南](./guide.md)
- [最佳实践](./best-practices.md)
