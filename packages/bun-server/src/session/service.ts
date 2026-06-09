import { Injectable } from '../di/decorators';
import { Inject } from '../di/decorators';
import type {
  SessionStore,
  SessionModuleOptions,
  Session,
  SessionData,
} from './types';
import { SESSION_OPTIONS_TOKEN } from './types';
import { randomBytes } from 'crypto';

/**
 * Session 服务
 */
@Injectable()
export class SessionService {
  private store: SessionStore;
  private name: string;
  private maxAge: number;
  private rolling: boolean;
  private cookieOptions: Required<SessionModuleOptions>['cookie'];

  public constructor(
    @Inject(SESSION_OPTIONS_TOKEN) options: SessionModuleOptions,
  ) {
    this.store = options.store!;
    this.name = options.name ?? 'sessionId';
    this.maxAge = options.maxAge ?? options.ttl ?? 86400000; // 24 小时
    this.rolling = options.rolling ?? true;
    this.cookieOptions = {
      secure: options.cookie?.secure ?? false,
      httpOnly: options.cookie?.httpOnly ?? true,
      path: options.cookie?.path ?? '/',
      domain: options.cookie?.domain,
      sameSite: options.cookie?.sameSite ?? 'lax',
    };
  }

  /**
   * 生成 Session ID
   * @returns Session ID
   */
  private generateSessionId(): string {
    return randomBytes(32).toString('hex');
  }

  /**
   * 创建新 Session
   * @param initialData - 初始数据
   * @returns Session
   */
  public async create(initialData: SessionData = {}): Promise<Session> {
    const now = Date.now();
    const session: Session = {
      id: this.generateSessionId(),
      data: initialData,
      createdAt: now,
      lastAccessedAt: now,
      expiresAt: now + this.maxAge,
    };

    await this.store.set(session, this.maxAge);
    return session;
  }

  /**
   * 获取 Session
   * @param sessionId - Session ID
   * @returns Session，如果不存在或已过期则返回 undefined
   */
  public async get(sessionId: string): Promise<Session | undefined> {
    const session = await this.store.get(sessionId);
    if (!session) {
      return undefined;
    }

    // 如果启用了 rolling，更新最后访问时间和过期时间
    if (this.rolling) {
      await this.touch(sessionId);
    }

    return session;
  }

  /**
   * 更新 Session 数据
   * @param sessionId - Session ID
   * @param data - 新数据
   * @returns 是否更新成功
   */
  public async set(
    sessionId: string,
    data: SessionData,
  ): Promise<boolean> {
    const session = await this.store.get(sessionId);
    if (!session) {
      return false;
    }

    session.data = { ...session.data, ...data };
    session.lastAccessedAt = Date.now();

    if (this.rolling) {
      session.expiresAt = Date.now() + this.maxAge;
    }

    return this.store.set(session, this.maxAge);
  }

  /**
   * 获取 Session 数据中的某个值
   * @param sessionId - Session ID
   * @param key - 数据键
   * @returns 数据值，如果不存在则返回 undefined
   */
  public async getValue<T = unknown>(
    sessionId: string,
    key: string,
  ): Promise<T | undefined> {
    const session = await this.store.get(sessionId);
    if (!session) {
      return undefined;
    }

    return session.data[key] as T | undefined;
  }

  /**
   * 设置 Session 数据中的某个值
   * @param sessionId - Session ID
   * @param key - 数据键
   * @param value - 数据值
   * @returns 是否设置成功
   */
  public async setValue<T = unknown>(
    sessionId: string,
    key: string,
    value: T,
  ): Promise<boolean> {
    const session = await this.store.get(sessionId);
    if (!session) {
      return false;
    }

    session.data[key] = value;
    session.lastAccessedAt = Date.now();

    if (this.rolling) {
      session.expiresAt = Date.now() + this.maxAge;
    }

    return this.store.set(session, this.maxAge);
  }

  /**
   * 删除 Session 数据中的某个值
   * @param sessionId - Session ID
   * @param key - 数据键
   * @returns 是否删除成功
   */
  public async deleteValue(sessionId: string, key: string): Promise<boolean> {
    const session = await this.store.get(sessionId);
    if (!session) {
      return false;
    }

    delete session.data[key];
    session.lastAccessedAt = Date.now();

    if (this.rolling) {
      session.expiresAt = Date.now() + this.maxAge;
    }

    return this.store.set(session, this.maxAge);
  }

  /**
   * 删除 Session
   * @param sessionId - Session ID
   * @returns 是否删除成功
   */
  public async delete(sessionId: string): Promise<boolean> {
    return this.store.delete(sessionId);
  }

  /**
   * 更新 Session 的最后访问时间
   * @param sessionId - Session ID
   * @returns 是否更新成功
   */
  public async touch(sessionId: string): Promise<boolean> {
    return this.store.touch(sessionId);
  }

  /**
   * 获取 Cookie 名称
   * @returns Cookie 名称
   */
  public getCookieName(): string {
    return this.name;
  }

  /**
   * 获取 Cookie 选项
   * @returns Cookie 选项
   */
  public getCookieOptions(): Required<SessionModuleOptions>['cookie'] {
    return this.cookieOptions;
  }

  /**
   * 获取最大存活时间
   * @returns 最大存活时间（毫秒）
   */
  public getMaxAge(): number {
    return this.maxAge;
  }
}
