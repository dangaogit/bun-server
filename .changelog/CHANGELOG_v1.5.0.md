# Changelog - v1.5.0

## 🎉 新功能

- ✨ 优雅停机支持
  - ✨ 自动监听 SIGTERM 和 SIGINT 信号，实现优雅停机
  - ✨ 停止接受新请求，等待正在处理的请求完成
  - ✨ 支持自定义优雅停机超时时间
  - ✨ 请求跟踪机制，准确统计活跃请求数
  - ✨ 超时保护机制，防止长时间等待

## 📝 改进

- ⚡ 优化服务器关闭流程，确保资源正确清理
- ⚡ 改进错误处理，优雅停机过程中的错误不会影响应用退出

## 📊 测试

- ✅ 新增优雅停机完整测试覆盖（7 个测试用例）
  - ✅ 测试新请求在停机期间被拒绝
  - ✅ 测试等待活跃请求完成
  - ✅ 测试超时强制关闭
  - ✅ 测试并发请求处理
  - ✅ 测试活跃请求数跟踪

---

**完整变更列表：**

- feat(core): add graceful shutdown support
- feat(server): add request tracking and graceful shutdown mechanism
- feat(application): add signal handlers for SIGTERM and SIGINT
- feat(server): add gracefulShutdownTimeout configuration option
- feat(application): add enableSignalHandlers configuration option
- test(core): add comprehensive graceful shutdown tests
