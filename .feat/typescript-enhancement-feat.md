# @dangao/bun-server TypeScript 类型增强功能请求

## 问题描述

当前 `@dangao/bun-server` 框架的 TypeScript 类型支持还有提升空间，特别是在类型推断和类型安全方面。这导致以下问题：

1. **类型推断不够完善**：某些场景下类型推断不够准确
2. **缺少类型安全的路由定义**：路由定义缺少类型检查
3. **类型提示不够友好**：某些 API 的类型提示不够清晰

## 功能需求

### 1. 更好的类型推断

框架应提供更好的类型推断，减少类型注解需求。

**期望实现**：

```typescript
// 自动推断返回类型
@GET('/users')
async getUsers() {
  // 返回类型自动推断为 Promise<User[]>
  return await this.userService.findAll();
}
```

### 2. 类型安全的路由定义

框架应支持类型安全的路由定义。

**期望实现**：

```typescript
// 类型安全的路由定义
const routes = {
  'GET /users': {
    handler: (req: GetUsersRequest) => Promise<GetUsersResponse>,
  },
  'POST /users': {
    handler: (req: CreateUserRequest) => Promise<CreateUserResponse>,
  },
} as const;
```

### 3. 开发模式增强

框架应提供开发模式增强功能。

**期望实现**：

- [ ] 热重载支持
- [ ] 开发模式错误提示
- [ ] 调试工具集成
- [ ] 类型检查增强

## 详细设计

### 类型推断优化

- 利用 TypeScript 4.9+ 的类型推断能力
- 提供更好的泛型支持
- 减少显式类型注解需求

### 类型安全路由

- 使用 TypeScript 模板字面量类型
- 路由路径类型检查
- 请求/响应类型关联

### 开发模式增强

- 热重载实现（基于文件监听）
- 开发模式错误提示优化
- 调试工具集成（Source Map 支持）

## 实现检查清单

### 类型推断优化

- [ ] 分析类型推断不足的场景
- [ ] 优化泛型定义
- [ ] 提供更好的类型提示

### 类型安全路由

- [ ] 实现类型安全的路由定义
- [ ] 路由路径类型检查
- [ ] 请求/响应类型关联

### 开发模式增强

- [ ] 实现热重载功能
- [ ] 开发模式错误提示
- [ ] 调试工具集成

### 文档和测试

- [ ] TypeScript 类型使用文档
- [ ] 类型安全最佳实践
- [ ] 类型测试

## 相关文件

### TypeScript 类型相关

- `src/**/*.ts` - 所有类型定义文件
- `tsconfig.json` - TypeScript 配置
- `src/core/types.ts` - 核心类型定义

## 优先级

**低优先级** - 这是开发体验的提升，能够改善开发体验但非必需功能。

