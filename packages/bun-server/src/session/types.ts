/**
 * Session 数据
 */
export interface SessionData {
  [key: string]: unknown;
}

/**
 * Session 信息
 */
export interface Session {
  /**
   * Session ID
   */
  id: string;

  /**
   * Session 数据
   */
  data: SessionData;

  /**
   * 创建时间
   */
  createdAt: number;

  /**
   * 最后访问时间
   */
  lastAccessedAt: number;

  /**
   * 过期时间（毫秒时间戳）
   */
  expiresAt: number;
}

/**
 * Session 存储接口
 */
export interface SessionStore {
  /**
   * 获取 Session
   * @param sessionId - Session ID
   * @returns Session，如果不存在或已过期则返回 undefined
   */
  get(sessionId: string): Promise<Session | undefined>;

  /**
   * 设置 Session
   * @param session - Session 信息
   * @param maxAge - 最大存活时间（毫秒）
   * @returns 是否设置成功
   */
  set(session: Session, maxAge: number): Promise<boolean>;

  /**
   * 删除 Session
   * @param sessionId - Session ID
   * @returns 是否删除成功
   */
  delete(sessionId: string): Promise<boolean>;

  /**
   * 检查 Session 是否存在
   * @param sessionId - Session ID
   * @returns 是否存在
   */
  has(sessionId: string): Promise<boolean>;

  /**
   * 更新 Session 的最后访问时间
   * @param sessionId - Session ID
   * @returns 是否更新成功
   */
  touch(sessionId: string): Promise<boolean>;

  /**
   * 清空所有 Session
   * @returns 是否清空成功
   */
  clear(): Promise<boolean>;
}

/**
 * 内存 Session 存储实现
 */
export class MemorySessionStore implements SessionStore {
  private store: Map<string, Session> = new Map();
  private cleanupInterval?: ReturnType<typeof setInterval>;

  public constructor(options?: { cleanupInterval?: number }) {
    // 定期清理过期 Session
    if (options?.cleanupInterval !== undefined) {
      this.cleanupInterval = setInterval(() => {
        this.cleanup();
      }, options.cleanupInterval);
    }
  }

  public async get(sessionId: string): Promise<Session | undefined> {
    const session = this.store.get(sessionId);
    if (!session) {
      return undefined;
    }

    // 检查是否过期
    if (Date.now() > session.expiresAt) {
      this.store.delete(sessionId);
      return undefined;
    }

    return session;
  }

  public async set(session: Session, maxAge: number): Promise<boolean> {
    const now = Date.now();
    session.expiresAt = now + maxAge;
    session.lastAccessedAt = now;
    this.store.set(session.id, session);
    return true;
  }

  public async delete(sessionId: string): Promise<boolean> {
    return this.store.delete(sessionId);
  }

  public async has(sessionId: string): Promise<boolean> {
    const session = this.store.get(sessionId);
    if (!session) {
      return false;
    }

    // 检查是否过期
    if (Date.now() > session.expiresAt) {
      this.store.delete(sessionId);
      return false;
    }

    return true;
  }

  public async touch(sessionId: string): Promise<boolean> {
    const session = this.store.get(sessionId);
    if (!session) {
      return false;
    }

    // 检查是否过期
    if (Date.now() > session.expiresAt) {
      this.store.delete(sessionId);
      return false;
    }

    // 更新最后访问时间
    session.lastAccessedAt = Date.now();
    return true;
  }

  public async clear(): Promise<boolean> {
    this.store.clear();
    return true;
  }

  /**
   * 清理过期 Session
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [sessionId, session] of this.store.entries()) {
      if (now > session.expiresAt) {
        this.store.delete(sessionId);
      }
    }
  }

  /**
   * 销毁存储，清理定时器
   */
  public destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }
    this.store.clear();
  }
}

/**
 * Redis Session 存储实现（需要 redis 包）
 */
export interface RedisSessionStoreOptions {
  /**
   * Redis 客户端（需要用户提供）
   */
  client: {
    get(key: string): Promise<string | null>;
    set(
      key: string,
      value: string,
      options?: { PX?: number },
    ): Promise<void>;
    del(key: string): Promise<void>;
    exists(key: string): Promise<number>;
    expire(key: string, seconds: number): Promise<void>;
  };
  /**
   * 键前缀
   * @default 'session:'
   */
  keyPrefix?: string;
}

export class RedisSessionStore implements SessionStore {
  private client: RedisSessionStoreOptions['client'];
  private keyPrefix: string;

  public constructor(options: RedisSessionStoreOptions) {
    this.client = options.client;
    this.keyPrefix = options.keyPrefix ?? 'session:';
  }

  private getKey(sessionId: string): string {
    return `${this.keyPrefix}${sessionId}`;
  }

  public async get(sessionId: string): Promise<Session | undefined> {
    try {
      const value = await this.client.get(this.getKey(sessionId));
      if (value === null) {
        return undefined;
      }
      return JSON.parse(value) as Session;
    } catch (_error) {
      return undefined;
    }
  }

  public async set(session: Session, maxAge: number): Promise<boolean> {
    try {
      const serialized = JSON.stringify(session);
      await this.client.set(this.getKey(session.id), serialized, {
        PX: maxAge,
      });
      return true;
    } catch (_error) {
      return false;
    }
  }

  public async delete(sessionId: string): Promise<boolean> {
    try {
      await this.client.del(this.getKey(sessionId));
      return true;
    } catch (_error) {
      return false;
    }
  }

  public async has(sessionId: string): Promise<boolean> {
    try {
      const result = await this.client.exists(this.getKey(sessionId));
      return result === 1;
    } catch (_error) {
      return false;
    }
  }

  public async touch(sessionId: string): Promise<boolean> {
    try {
      const session = await this.get(sessionId);
      if (!session) {
        return false;
      }

      // 更新最后访问时间
      session.lastAccessedAt = Date.now();
      const remainingTime = session.expiresAt - Date.now();
      if (remainingTime > 0) {
        await this.client.expire(this.getKey(sessionId), Math.floor(remainingTime / 1000));
        return true;
      }

      return false;
    } catch (_error) {
      return false;
    }
  }

  public async clear(): Promise<boolean> {
    // Redis 没有直接清空所有 session 的方法
    // 实际实现中可能需要使用 SCAN 命令遍历所有键
    // 这里简化处理，返回 false
    return false;
  }
}

/**
 * SessionModule 配置选项
 */
export interface SessionModuleOptions {
  /**
   * Session 存储实现
   * @default MemorySessionStore
   */
  store?: SessionStore;

  /**
   * Session 名称（Cookie 名称）
   * @default 'sessionId'
   */
  name?: string;

  /**
   * Session 最大存活时间（毫秒）
   * @default 86400000 (24 小时)
   */
  maxAge?: number;

  /**
   * 是否在每次访问时更新过期时间
   * @default true
   */
  rolling?: boolean;

  /**
   * Cookie 选项
   */
  cookie?: {
    /**
     * 是否只在 HTTPS 下发送
     * @default false
     */
    secure?: boolean;

    /**
     * 是否只能通过 HTTP 访问（不能通过 JavaScript）
     * @default true
     */
    httpOnly?: boolean;

    /**
     * Cookie 路径
     * @default '/'
     */
    path?: string;

    /**
     * Cookie 域名
     */
    domain?: string;

    /**
     * SameSite 属性
     * @default 'lax'
     */
    sameSite?: 'strict' | 'lax' | 'none';
  };
}

/**
 * SessionService Token
 */
export const SESSION_SERVICE_TOKEN = Symbol(
  '@dangao/bun-server:session:service',
);

/**
 * SessionModule Options Token
 */
export const SESSION_OPTIONS_TOKEN = Symbol(
  '@dangao/bun-server:session:options',
);
