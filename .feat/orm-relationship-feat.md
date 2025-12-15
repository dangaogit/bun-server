# @dangao/bun-server ORM 关系映射功能请求

## 问题描述

当前 `@dangao/bun-server` 框架的 ORM
集成仅支持基本的实体和列定义，缺少关系映射支持。这导致以下问题：

1. **无法定义实体间关系**：如一对多、多对一、多对多关系
2. **无法进行关系查询**：无法通过关系自动加载关联数据
3. **缺少延迟加载支持**：无法按需加载关联数据，影响性能

## 功能需求

### 1. 关系装饰器支持

框架应支持以下关系装饰器：

- `@OneToMany()` - 一对多关系
- `@ManyToOne()` - 多对一关系
- `@ManyToMany()` - 多对多关系

**期望实现**：

```typescript
@Entity("users")
class User {
  @PrimaryKey()
  public id!: number;

  @Column()
  public name!: string;

  @OneToMany(() => Post, "userId")
  public posts!: Post[];

  @ManyToMany(() => Role, "user_roles")
  public roles!: Role[];
}

@Entity("posts")
class Post {
  @PrimaryKey()
  public id!: number;

  @Column()
  public title!: string;

  @ManyToOne(() => User, "userId")
  public user!: User;
}
```

### 2. 关系查询支持

框架应支持通过关系自动加载关联数据。

**期望实现**：

```typescript
@Repository("users", "id")
class UserRepository extends BaseRepository<User> {
  // 自动加载关联的 posts
  async findWithPosts(id: number): Promise<User | null> {
    const user = await this.findById(id);
    if (user) {
      user.posts = await this.loadRelation(user, "posts");
    }
    return user;
  }
}
```

### 3. 延迟加载支持

框架应支持延迟加载，按需加载关联数据。

**期望实现**：

```typescript
// 延迟加载配置
@OneToMany(() => Post, 'userId', { lazy: true })
public posts!: Promise<Post[]>;

// 使用时按需加载
const user = await userRepository.findById(1);
const posts = await user.posts; // 延迟加载
```

## 详细设计

### 关系元数据定义

```typescript
export interface RelationshipMetadata {
  type: "OneToMany" | "ManyToOne" | "ManyToMany";
  target: Constructor<unknown>;
  foreignKey?: string;
  joinTable?: string;
  lazy?: boolean;
  cascade?: boolean;
}
```

### 关系查询实现

- 支持通过外键自动查询关联数据
- 支持 JOIN 查询优化
- 支持批量加载避免 N+1 问题

## 实现检查清单

### 关系装饰器实现

- [ ] 实现 `@OneToMany()` 装饰器
- [ ] 实现 `@ManyToOne()` 装饰器
- [ ] 实现 `@ManyToMany()` 装饰器
- [ ] 关系元数据存储和读取

### 关系查询实现

- [ ] 实现关系数据加载逻辑
- [ ] 支持 JOIN 查询
- [ ] 支持批量加载优化

### 延迟加载实现

- [ ] 实现延迟加载代理
- [ ] 支持 Promise 延迟加载
- [ ] 性能优化

### 文档和测试

- [ ] 更新 ORM 文档
- [ ] 添加关系映射示例
- [ ] 添加单元测试和集成测试

## 相关文件

### 关系装饰器相关

- `src/database/orm/decorators.ts` - 添加关系装饰器
- `src/database/orm/repository.ts` - 实现关系查询逻辑
- `src/database/orm/types.ts` - 关系元数据类型定义

## 优先级

**高优先级** - 这是 ORM 功能的重要补充，能够显著提升框架的数据库操作能力。
