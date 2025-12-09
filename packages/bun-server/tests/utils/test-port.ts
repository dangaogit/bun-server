/**
 * 获取测试专用端口
 * 使用随机高位端口，降低并行测试的端口冲突概率
 * @returns 不同测试之间不冲突的端口号
 */
export function getTestPort(): number {
  // 选择 30000-59999 之间的随机端口，避免常用端口冲突
  return 30000 + Math.floor(Math.random() * 30000);
}

