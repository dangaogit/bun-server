/**
 * 获取测试专用端口
 * 使用随机高位端口，并主动探测端口可用性，降低并行测试/系统占用导致的端口冲突概率
 * @returns 不同测试之间不冲突的端口号
 */
export function getTestPort(): number {
  // 优先使用 port=0 让系统自动分配可用端口，避免随机端口碰撞导致的 flake
  // 取到 probe.port 后立刻 stop，返回这个“刚刚可用”的端口供后续测试使用
  try {
    const probe = Bun.serve({
      port: 0,
      fetch: () => new Response('ok'),
    });
    const port = probe.port;
    probe.stop();
    return port;
  } catch (error) {
    // fallback：极端情况下（或运行环境限制监听端口）才会走到这里
    let lastError: unknown = error;
    for (let i = 0; i < 50; i++) {
      const port = 30000 + Math.floor(Math.random() * 30000);
      try {
        const probe = Bun.serve({
          port,
          fetch: () => new Response('ok'),
        });
        probe.stop();
        return port;
      } catch (err) {
        lastError = err;
      }
    }

    throw new Error(
      `Unable to find an available test port. Last error: ${String(lastError)}`,
    );
  }
}

