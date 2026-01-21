# Changelog - v1.8.0

## 🎉 新功能

### Phase 1: 架构文档与生命周期完善

- ✨ 添加详细的请求生命周期文档 (`docs/request-lifecycle.md`)
- ✨ 更新 README.md 架构部分，添加完整的架构图
- ✨ 添加模块系统架构图和 DI 容器架构说明
- ✨ 同步更新中文文档

### Phase 2: Guards 守卫系统

- ✨ 实现 `@UseGuards()` 装饰器，支持控制器和方法级别
- ✨ 实现 `CanActivate` 接口和 `ExecutionContext` 接口
- ✨ 实现内置 `AuthGuard` 认证守卫
- ✨ 实现内置 `RolesGuard` 角色守卫
- ✨ 实现 `@Roles()` 装饰器用于声明所需角色
- ✨ Guards 在中间件之后、拦截器之前执行
- ✨ 添加 `guards-app.ts` 示例

### Phase 3: 验证系统增强

- ✨ 新增对象验证规则：`IsObject`, `ValidateNested`, `IsNotEmpty`, `IsNotEmptyObject`
- ✨ 新增数组验证规则：`IsArray`, `ArrayMinSize`, `ArrayMaxSize`, `ArrayUnique`, `ArrayContains`, `ArrayNotContains`, `ArrayNotEmpty`
- ✨ 新增条件验证规则：`ValidateIf`
- ✨ 新增类型转换规则：`Transform`
- ✨ 新增常用验证规则：`IsUUID`, `IsDate`, `IsBoolean`, `IsInt`, `IsPositive`, `IsNegative`, `Min`, `Max`, `Length`, `MaxLength`, `Matches`, `IsIn`, `IsNotIn`, `IsUrl`, `IsJSON`, `Equals`, `NotEquals`, `IsDefined`, `IsAlphanumeric`, `IsAlpha`, `IsNumberString`
- ✨ 实现自定义验证器工厂：`createCustomValidator`, `createSimpleValidator`, `createRegexValidator`
- ✨ 实现 DTO 类级别验证：`@ValidateClass()`, `@Property()`, `@NestedProperty()`, `@ArrayNestedProperty()`
- ✨ 支持嵌套对象验证
- ✨ 添加 `validation-app.ts` 示例

### Phase 4: @Global() 模块装饰器

- ✨ 实现 `@Global()` 装饰器，使模块的提供者可全局访问
- ✨ 全局模块的 exports 自动注册到根容器
- ✨ 其他模块无需导入全局模块即可使用其导出的服务
- ✨ 添加 `global-module-app.ts` 示例

### Phase 5: EventEmitter 事件系统

- ✨ 实现 `EventEmitterService` 事件发射器服务
- ✨ 支持同步发布事件 (`emit`)
- ✨ 支持异步发布事件 (`emitAsync`)
- ✨ 实现 `@OnEvent()` 装饰器用于声明式事件监听
- ✨ 支持事件优先级
- ✨ 支持通配符事件匹配 (`*` 单段, `**` 多段)
- ✨ 实现 `EventModule` 模块，支持 `forRoot()` 配置
- ✨ 添加 `events-app.ts` 示例

## 📝 改进

- ⚡ 统一所有示例文件的 curl 命令输出格式
- ⚡ 更新 `docs/guide.md` 添加守卫、验证、全局模块、事件系统章节
- ⚡ 同步更新中文文档

## 📊 测试

- ✅ Guards 守卫系统：98 tests, 100% pass
- ✅ 验证系统增强：129 tests, 100% pass
- ✅ @Global() 模块装饰器：11 tests, 100% pass
- ✅ EventEmitter 事件系统：54 tests, 100% pass

## 📦 新增文件

### 事件系统
- `src/events/types.ts` - 事件系统类型定义
- `src/events/service.ts` - EventEmitterService 实现
- `src/events/decorators.ts` - @OnEvent() 装饰器
- `src/events/event-module.ts` - EventModule 模块
- `src/events/index.ts` - 导出

### 守卫系统
- `src/security/guards/types.ts` - 守卫接口定义
- `src/security/guards/decorators.ts` - @UseGuards(), @Roles() 装饰器
- `src/security/guards/auth-guard.ts` - AuthGuard 实现
- `src/security/guards/roles-guard.ts` - RolesGuard 实现

### 验证系统
- `src/validation/rules/object.ts` - 对象验证规则
- `src/validation/rules/array.ts` - 数组验证规则
- `src/validation/rules/common.ts` - 通用验证规则
- `src/validation/rules/conditional.ts` - 条件和转换规则
- `src/validation/custom-validator.ts` - 自定义验证器工厂
- `src/validation/class-validator.ts` - 类级别验证

### 文档
- `docs/request-lifecycle.md` - 请求生命周期文档
- `docs/guards.md` - Guards 守卫使用指南
- `docs/events.md` - 事件系统使用指南
- `docs/zh/request-lifecycle.md` - 中文请求生命周期文档
- `docs/zh/guards.md` - 中文守卫使用指南
- `docs/zh/events.md` - 中文事件系统使用指南

### 示例
- `examples/01-basic/global-module-app.ts` - 全局模块示例
- `examples/02-official-modules/guards-app.ts` - 守卫示例
- `examples/02-official-modules/validation-app.ts` - 验证示例
- `examples/02-official-modules/events-app.ts` - 事件系统示例

---

**完整变更列表：**

- docs: add request lifecycle documentation and update architecture
- feat(security): implement Guards system for route access control
- feat(validation): enhance validation system with object, array rules and custom validators
- feat(di): implement @Global() module decorator for shared providers
- feat(events): implement EventEmitter event system
