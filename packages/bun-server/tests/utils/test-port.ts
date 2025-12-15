/**
 * 获取测试专用端口
 * 使用随机高位端口，并主动探测端口可用性，降低并行测试/系统占用导致的端口冲突概率
 * @returns 不同测试之间不冲突的端口号
 */
export function getTestPort(): number {
  // 选择 30000-59999 之间的随机端口，避免常用端口冲突
  // 并通过 Bun.serve 探测端口是否可用（可用则立刻 stop），避免 EADDRINUSE 造成测试雪崩失败
  let lastError: unknown;
  for (let i = 0; i < 50; i++) {
    const port = 30000 + Math.floor(Math.random() * 30000);
    try {
      const probe = Bun.serve({
        port,
        fetch: () => new Response('ok'),
      });
      probe.stop();
      return port;
    } catch (error) {
      lastError = error;
      // 端口占用，继续尝试
    }
  }

  throw new Error(
    `Unable to find an available test port. Last error: ${String(lastError)}`,
  );
}

