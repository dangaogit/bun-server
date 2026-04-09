/**
 * 框架无关的测试套件接口
 * 让 shared cases 文件在 bun:test 和 vitest 中都能运行，无需任何适配层
 */
export interface TestSuite {
  test: (name: string, fn: () => void | Promise<void>) => void;
  expect: (actual: unknown) => {
    toBe(e: unknown): void;
    toEqual(e: unknown): void;
    toBeTruthy(): void;
    toBeFalsy(): void;
    toContain(e: unknown): void;
    toBeGreaterThan(e: number): void;
    toBeGreaterThanOrEqual(e: number): void;
    toBeLessThan(e: number): void;
    toBeLessThanOrEqual(e: number): void;
    toBeInstanceOf(e: unknown): void;
    toHaveLength(e: number): void;
    not: {
      toBe(e: unknown): void;
      toBeNull(): void;
      toBeUndefined(): void;
      toThrow(): void;
    };
    resolves: {
      toBeTruthy(): Promise<void>;
    };
    rejects: {
      toThrow(): Promise<void>;
    };
  };
  beforeEach: (fn: () => void | Promise<void>) => void;
}
