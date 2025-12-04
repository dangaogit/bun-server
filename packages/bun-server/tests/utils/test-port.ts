let nextPort = 4500;

/**
 * 获取测试专用端口
 * @returns 不同测试之间不冲突的端口号
 */
export function getTestPort(): number {
  nextPort += 1;
  return nextPort;
}

