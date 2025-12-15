# Changelog - v1.3.0

## 🎉 新功能

- ✨ 新增 `@QueryMap()` 参数装饰器：一次性注入完整查询参数对象，支持重复 key 自动聚合为数组
- ✨ 新增 `@HeaderMap()` 参数装饰器：一次性注入完整请求头对象，支持多值聚合、规范化（小写）和筛选
- ✨ `@QueryMap()` 和 `@HeaderMap()` 支持 `transform` 和 `validate` 选项，便于数据转换和验证

## 🐛 修复

- 🔧 修复 `@HeaderMap()` 在 `normalize: true` 时，`pick` 选项大小写不匹配导致过滤失败的问题
- 🔧 修复 `@HeaderMap()` 单值 header 未 trim 导致与多值 header 行为不一致的问题
- 🔧 修复 `@HeaderMap()` 在 `normalize: false` 时，`pick` 选项无法匹配的问题（Headers API 总是返回小写 key）

## 📝 改进

- ⚡ `@QueryMap()` 和 `@HeaderMap()` 支持泛型类型，提供更好的类型安全
- ⚡ `@HeaderMap()` 默认启用 `normalize: true`，统一 header key 为小写
- ⚡ `@HeaderMap()` 支持 `pick` 选项，可选择性提取特定 header

## 📊 测试

- ✅ 新增 `@QueryMap()` 和 `@HeaderMap()` 完整测试覆盖（聚合、转换、验证、筛选等场景）
- ✅ 新增 header 值 trim 一致性测试
- ✅ 新增 `normalize: false` 时 `pick` 选项大小写兼容性测试

---

**完整变更列表：**

- feat(controller): add query/header map decorators
- fix(controller): normalize header pick keys when normalize option enabled
- fix(controller): trim single header values consistently
- fix(controller): always normalize pick keys for HeaderMap regardless of normalize option
- test(controller): add comprehensive tests for QueryMap and HeaderMap decorators
- docs: add QueryMap/HeaderMap usage examples in README

