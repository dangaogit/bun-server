declare global {
  interface Body {
    json(): Promise<any>;
  }

  interface Response {
    json(): Promise<any>;
  }
}

declare module 'bun:test' {
  export function expect(actual?: any): any;
  export function mock(fn?: (...args: any[]) => any): any;

  interface MatchersBuiltin<T = unknown> {
    toBe(expected: any): void;
  }

  interface Matchers<T = unknown> {
    toBe(expected: any): void;
  }
}

declare module '@dangao/logsmith' {
  interface LogEntry {
    data?: unknown;
  }
}

export {};
