# @dangao/bun-server 部署工具功能请求

## 问题描述

当前 `@dangao/bun-server` 框架缺少部署相关工具，开发者需要手动配置 Docker 和部署脚本。这导致以下问题：

1. **Docker 配置繁琐**：需要手动编写 Dockerfile
2. **缺少部署脚本**：需要手动编写部署脚本
3. **环境配置管理**：不同环境的配置管理不够便捷

## 功能需求

### 1. Docker 镜像构建

框架应提供 Docker 镜像构建支持。

**期望实现**：

```bash
# 生成 Dockerfile
bun-server docker generate

# 构建 Docker 镜像
docker build -t my-app:latest .
```

**生成的 Dockerfile**：

```dockerfile
FROM oven/bun:latest

WORKDIR /app

COPY package.json bun.lockb ./
RUN bun install --production

COPY . .

EXPOSE 3000

CMD ["bun", "run", "src/main.ts"]
```

### 2. 部署脚本

框架应提供部署脚本生成工具。

**期望实现**：

```bash
# 生成部署脚本
bun-server deploy generate

# 生成的部署脚本
./deploy.sh production
```

### 3. 环境配置管理

框架应支持环境配置管理。

**期望实现**：

```typescript
// config/production.ts
export default {
  app: {
    port: 3000,
    env: 'production',
  },
  database: {
    // 生产环境配置
  },
};
```

## 详细设计

### Docker 工具

- 生成优化的 Dockerfile
- 支持多阶段构建
- 支持 .dockerignore 生成

### 部署脚本

- 支持多种部署目标（Docker, Kubernetes, 云平台）
- 环境配置管理
- 部署前检查

## 实现检查清单

### Docker 工具实现

- [ ] Dockerfile 模板生成
- [ ] .dockerignore 生成
- [ ] 多阶段构建支持

### 部署脚本实现

- [ ] 部署脚本生成
- [ ] 环境配置管理
- [ ] 部署前检查

### 文档和测试

- [ ] 部署工具使用文档
- [ ] 添加部署示例
- [ ] 添加测试

## 相关文件

### 部署工具相关

- `packages/bun-server-cli/src/commands/docker.ts` - Docker 命令
- `packages/bun-server-cli/src/commands/deploy.ts` - 部署命令
- `packages/bun-server-cli/src/templates/` - Dockerfile 和部署脚本模板

## 优先级

**低优先级** - 这是可选功能，根据需求决定是否实现。

