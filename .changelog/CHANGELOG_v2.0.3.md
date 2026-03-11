# Changelog - v2.0.3

## 🐛 修复

- 🔧 修复 `examples/deploy` 反向代理 WebSocket 时缺少升级头透传的问题，确保 `wss` 连接可以正确升级并稳定转发
- 🔧 修复 WebSocket 示例在 HTTPS 页面下仍使用 `ws://` 导致混合内容失败的问题，统一按页面协议自动切换到 `wss://`

## 📝 改进

- ⚡ 优化 examples 门户与部署示例的一致性，补充并对齐示例访问与运行路径
- ⚡ 更新 `packages/web` 更新日志内容，补充 `v2.0.3` 发布记录并保持中英文页面同步

---

**完整变更列表：**

- fix(examples/deploy): proxy websocket traffic correctly
- fix(examples/websocket): use wss on https pages
- docs: change playground to examples
