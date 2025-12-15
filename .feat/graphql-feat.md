# @dangao/bun-server GraphQL 支持功能请求

## 问题描述

当前 `@dangao/bun-server` 框架仅支持 RESTful API，缺少 GraphQL 支持。这导致以下问题：

1. **无法使用 GraphQL**：无法提供 GraphQL API 端点
2. **缺少类型安全**：GraphQL 提供强类型和自动文档生成
3. **客户端灵活性**：GraphQL 允许客户端按需查询数据

## 功能需求

### 1. GraphQL 服务器集成

框架应支持 GraphQL 服务器集成。

**期望实现**：

```typescript
GraphQLModule.forRoot({
  schema: './src/schema.graphql',
  playground: true,
  path: '/graphql',
});
```

### 2. Schema 定义

框架应支持 GraphQL Schema 定义。

**期望实现**：

```graphql
type User {
  id: ID!
  name: String!
  email: String!
  posts: [Post!]!
}

type Query {
  user(id: ID!): User
  users: [User!]!
}
```

### 3. Resolver 装饰器

框架应提供 Resolver 装饰器，简化 GraphQL Resolver 开发。

**期望实现**：

```typescript
@Resolver('User')
export class UserResolver {
  @Query('user')
  async getUser(@Arg('id') id: string): Promise<User> {
    // ...
  }

  @Query('users')
  async getUsers(): Promise<User[]> {
    // ...
  }

  @FieldResolver('posts')
  async getPosts(@Parent() user: User): Promise<Post[]> {
    // ...
  }
}
```

### 4. GraphQL Playground 集成

框架应集成 GraphQL Playground，提供交互式 GraphQL 查询界面。

**期望实现**：

- 自动提供 `/graphql` 端点
- 集成 GraphQL Playground UI
- 支持查询和变更操作

## 详细设计

### GraphQLModule 结构

```typescript
@Module({
  providers: [GraphQLService],
})
export class GraphQLModule {
  public static forRoot(options: GraphQLModuleOptions): typeof GraphQLModule {
    // 注册 GraphQLService
    // 配置 Schema 和 Resolver
  }
}
```

### Resolver 装饰器

```typescript
export function Resolver(type: string): ClassDecorator;
export function Query(name: string): MethodDecorator;
export function Mutation(name: string): MethodDecorator;
export function FieldResolver(field: string): MethodDecorator;
export function Arg(name: string): ParameterDecorator;
export function Parent(): ParameterDecorator;
```

## 实现检查清单

### GraphQL 服务器集成

- [ ] 集成 GraphQL 服务器库（如 graphql-http）
- [ ] 实现 GraphQLModule
- [ ] Schema 加载和解析
- [ ] Resolver 注册和执行

### Resolver 装饰器实现

- [ ] 实现 `@Resolver()` 装饰器
- [ ] 实现 `@Query()` 装饰器
- [ ] 实现 `@Mutation()` 装饰器
- [ ] 实现 `@FieldResolver()` 装饰器
- [ ] 实现参数装饰器（`@Arg()`, `@Parent()`）

### GraphQL Playground 集成

- [ ] 集成 GraphQL Playground UI
- [ ] 提供交互式查询界面
- [ ] 支持查询和变更操作

### 文档和测试

- [ ] GraphQL 使用文档
- [ ] Resolver 开发指南
- [ ] 添加示例代码
- [ ] 添加单元测试和集成测试

## 相关文件

### GraphQL 模块相关

- `src/graphql/graphql-module.ts` - GraphQLModule 实现
- `src/graphql/graphql-service.ts` - GraphQLService 实现
- `src/graphql/decorators.ts` - Resolver 装饰器
- `src/graphql/types.ts` - GraphQL 相关类型定义

## 优先级

**低优先级** - 这是可选功能，根据需求决定是否实现。

