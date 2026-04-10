/**
 * 支持的运行时平台标识
 */
export type PlatformEngine = 'bun' | 'node';

/**
 * 文件引用抽象接口（替代 BunFile 的直接使用）
 */
export interface IFileRef {
  readonly type: string;
  readonly size: number;
  text(): Promise<string>;
  bytes(): Promise<Uint8Array>;
  arrayBuffer(): Promise<ArrayBuffer>;
  exists(): Promise<boolean>;
  /** 返回可读流，用于 new Response(file.stream(), ...) */
  stream(): ReadableStream<Uint8Array>;
}

/**
 * 文件系统适配器接口
 */
export interface IFsAdapter {
  /** 获取文件引用 */
  file(path: string): IFileRef;
  /** 写入文件 */
  write(path: string, data: string | Uint8Array | ArrayBuffer): Promise<void>;
  /** 匹配文件列表 */
  glob(pattern: string, cwd?: string): string[];
}

/**
 * 哈希器接口（替代 Bun.CryptoHasher）
 */
export interface IHasher {
  update(data: string | Uint8Array | ArrayBuffer): IHasher;
  digest(): Uint8Array;
  digest(encoding: 'hex' | 'base64' | 'base64url'): string;
}

/**
 * 加密适配器接口
 */
export interface ICryptoAdapter {
  createHasher(algorithm: string): IHasher;
}

/**
 * 解析器适配器接口
 */
export interface IParserAdapter {
  parseJSONC(content: string): unknown;
  parseJSON5(content: string): unknown;
  parseJSONL(content: string): unknown[];
  renderMarkdown(md: string): string;
  /** 将 Markdown 渲染为 ANSI 着色字符串，用于终端 / CLI 输出（Bun 1.3.12+） */
  renderMarkdownAnsi(md: string): string;
}

/**
 * 子进程接口
 */
export interface IChildProcess {
  readonly pid: number;
  readonly exited: Promise<number | null>;
  kill(signal?: string | number): void;
}

/**
 * spawn 选项
 */
export interface SpawnOptions {
  cmd: string[];
  env?: Record<string, string | undefined>;
  stdout?: 'inherit' | 'pipe' | 'ignore';
  stderr?: 'inherit' | 'pipe' | 'ignore';
}

/**
 * 进程适配器接口
 */
export interface IProcessAdapter {
  spawn(options: SpawnOptions): IChildProcess;
  sleep(ms: number): Promise<void>;
}

/**
 * WebSocket 连接抽象接口（替代 Bun.ServerWebSocket）
 */
export interface IWebSocket<T = unknown> {
  readonly data: T;
  readonly readyState: number;
  send(data: string | Buffer | Uint8Array): void;
  close(code?: number, reason?: string): void;
}

/**
 * WebSocket 事件处理器集合
 */
export interface WebSocketHandlers<T = unknown> {
  open?: (ws: IWebSocket<T>) => void | Promise<void>;
  message?: (ws: IWebSocket<T>, msg: string | Buffer) => void | Promise<void>;
  close?: (ws: IWebSocket<T>, code: number, reason: string) => void | Promise<void>;
}

/**
 * HTTP 服务启动选项
 */
export interface HttpServeOptions<T = unknown> {
  port?: number;
  hostname?: string;
  reusePort?: boolean;
  idleTimeout?: number;
  /** Unix socket 路径（cluster proxy 模式使用） */
  unix?: string;
  fetch: (request: Request, server: IServerHandle) => Response | Promise<Response | undefined> | undefined;
  websocket?: WebSocketHandlers<T>;
}

/**
 * 服务器句柄接口（替代 Bun.Server）
 */
export interface IServerHandle {
  readonly port: number;
  readonly hostname?: string;
  stop(): void;
  /** 升级 WebSocket 连接（Bun 原生升级） */
  upgrade?(request: Request, options?: { data?: unknown }): boolean;
  /** 设置连接超时（Bun 专属） */
  timeout?(request: Request, seconds: number): void;
  /** 获取底层原生服务器实例（不推荐，类型为 unknown） */
  getNative(): unknown;
}

/**
 * HTTP 驱动适配器接口
 */
export interface IHttpDriver {
  serve<T = unknown>(options: HttpServeOptions<T>): Promise<IServerHandle>;
}

/**
 * 平台接口聚合
 */
export interface IPlatform {
  readonly engine: PlatformEngine;
  readonly fs: IFsAdapter;
  readonly crypto: ICryptoAdapter;
  readonly parser: IParserAdapter;
  readonly process: IProcessAdapter;
  readonly http: IHttpDriver;
}
