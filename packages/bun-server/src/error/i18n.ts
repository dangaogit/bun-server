import { ErrorCode, ERROR_CODE_MESSAGES } from './error-codes';

/**
 * 支持的语言
 */
export type SupportedLanguage = 'en' | 'zh-CN' | 'ja' | 'ko';

/**
 * 消息模板参数
 */
export interface MessageParams {
  [key: string]: string | number | boolean | undefined;
}

/**
 * 错误消息国际化映射
 * 支持消息模板，使用 {key} 作为占位符
 * 例如：'资源 {resource} 未找到'，可以通过参数替换 {resource}
 */
const ERROR_MESSAGES_I18N: Record<SupportedLanguage, Partial<Record<ErrorCode, string>>> = {
  'en': {
    // 使用默认英文消息
    ...ERROR_CODE_MESSAGES,
  },
  'zh-CN': {
    // 通用错误
    [ErrorCode.INTERNAL_ERROR]: '服务器内部错误',
    [ErrorCode.INVALID_REQUEST]: '无效的请求',
    [ErrorCode.RESOURCE_NOT_FOUND]: '资源未找到',
    [ErrorCode.METHOD_NOT_ALLOWED]: '方法不允许',
    [ErrorCode.RATE_LIMIT_EXCEEDED]: '请求频率超限',
    [ErrorCode.SERVICE_UNAVAILABLE]: '服务不可用',
    [ErrorCode.TIMEOUT]: '请求超时',

    // 认证和授权错误
    [ErrorCode.AUTH_REQUIRED]: '需要认证',
    [ErrorCode.AUTH_INVALID_TOKEN]: '无效的认证令牌',
    [ErrorCode.AUTH_TOKEN_EXPIRED]: '认证令牌已过期',
    [ErrorCode.AUTH_INSUFFICIENT_PERMISSIONS]: '权限不足',
    [ErrorCode.AUTH_INVALID_CREDENTIALS]: '无效的凭据',
    [ErrorCode.AUTH_ACCOUNT_LOCKED]: '账户已锁定',
    [ErrorCode.AUTH_ACCOUNT_DISABLED]: '账户已禁用',

    // 验证错误
    [ErrorCode.VALIDATION_FAILED]: '验证失败',
    [ErrorCode.VALIDATION_REQUIRED_FIELD]: '必填字段缺失',
    [ErrorCode.VALIDATION_INVALID_FORMAT]: '格式无效',
    [ErrorCode.VALIDATION_OUT_OF_RANGE]: '值超出范围',
    [ErrorCode.VALIDATION_TYPE_MISMATCH]: '类型不匹配',
    [ErrorCode.VALIDATION_CONSTRAINT_VIOLATION]: '约束违反',

    // OAuth2 错误
    [ErrorCode.OAUTH2_INVALID_CLIENT]: '无效的客户端',
    [ErrorCode.OAUTH2_INVALID_GRANT]: '无效的授权',
    [ErrorCode.OAUTH2_INVALID_SCOPE]: '无效的作用域',
    [ErrorCode.OAUTH2_INVALID_REDIRECT_URI]: '无效的重定向 URI',
    [ErrorCode.OAUTH2_UNSUPPORTED_GRANT_TYPE]: '不支持的授权类型',
    [ErrorCode.OAUTH2_ACCESS_DENIED]: '访问被拒绝',
    [ErrorCode.OAUTH2_SERVER_ERROR]: 'OAuth2 服务器错误',

    // 数据库错误
    [ErrorCode.DATABASE_CONNECTION_FAILED]: '数据库连接失败',
    [ErrorCode.DATABASE_QUERY_FAILED]: '数据库查询失败',
    [ErrorCode.DATABASE_TRANSACTION_FAILED]: '数据库事务失败',
    [ErrorCode.DATABASE_CONSTRAINT_VIOLATION]: '数据库约束违反',
    [ErrorCode.DATABASE_TIMEOUT]: '数据库超时',
    [ErrorCode.DATABASE_POOL_EXHAUSTED]: '数据库连接池耗尽',
    [ErrorCode.DATABASE_MIGRATION_FAILED]: '数据库迁移失败',

    // 文件操作错误
    [ErrorCode.FILE_NOT_FOUND]: '文件未找到',
    [ErrorCode.FILE_UPLOAD_FAILED]: '文件上传失败',
    [ErrorCode.FILE_DOWNLOAD_FAILED]: '文件下载失败',
    [ErrorCode.FILE_SIZE_EXCEEDED]: '文件大小超限',
    [ErrorCode.FILE_TYPE_NOT_ALLOWED]: '不允许的文件类型',
    [ErrorCode.FILE_ACCESS_DENIED]: '文件访问被拒绝',
    [ErrorCode.FILE_PATH_TRAVERSAL]: '检测到路径遍历攻击',

    // 中间件错误
    [ErrorCode.MIDDLEWARE_EXECUTION_FAILED]: '中间件执行失败',
    [ErrorCode.MIDDLEWARE_TIMEOUT]: '中间件超时',
    [ErrorCode.CORS_NOT_ALLOWED]: 'CORS 不允许',

    // 配置错误
    [ErrorCode.CONFIG_INVALID]: '无效的配置',
    [ErrorCode.CONFIG_MISSING]: '缺少配置',
    [ErrorCode.CONFIG_VALIDATION_FAILED]: '配置验证失败',
  },
  'ja': {
    // 日语翻译（部分常用错误码）
    [ErrorCode.INTERNAL_ERROR]: 'サーバー内部エラー',
    [ErrorCode.INVALID_REQUEST]: '無効なリクエスト',
    [ErrorCode.RESOURCE_NOT_FOUND]: 'リソースが見つかりません',
    [ErrorCode.AUTH_REQUIRED]: '認証が必要です',
    [ErrorCode.AUTH_INVALID_TOKEN]: '無効な認証トークン',
    [ErrorCode.VALIDATION_FAILED]: '検証に失敗しました',
  },
  'ko': {
    // 韩语翻译（部分常用错误码）
    [ErrorCode.INTERNAL_ERROR]: '서버 내부 오류',
    [ErrorCode.INVALID_REQUEST]: '잘못된 요청',
    [ErrorCode.RESOURCE_NOT_FOUND]: '리소스를 찾을 수 없습니다',
    [ErrorCode.AUTH_REQUIRED]: '인증이 필요합니다',
    [ErrorCode.AUTH_INVALID_TOKEN]: '잘못된 인증 토큰',
    [ErrorCode.VALIDATION_FAILED]: '유효성 검사 실패',
  },
};

/**
 * 错误消息国际化服务
 * 支持消息模板和参数替换
 */
export class ErrorMessageI18n {
  private static currentLanguage: SupportedLanguage = 'en';

  /**
   * 设置当前语言
   */
  public static setLanguage(language: SupportedLanguage): void {
    this.currentLanguage = language;
  }

  /**
   * 获取当前语言
   */
  public static getLanguage(): SupportedLanguage {
    return this.currentLanguage;
  }

  /**
   * 获取错误消息（国际化）
   * @param code - 错误码
   * @param language - 语言（可选，默认使用当前语言）
   * @param params - 消息模板参数（可选）
   * @returns 国际化后的错误消息
   *
   * @example
   * ```ts
   * // 基本用法
   * ErrorMessageI18n.getMessage(ErrorCode.RESOURCE_NOT_FOUND);
   *
   * // 带参数的消息模板
   * ErrorMessageI18n.getMessage(ErrorCode.RESOURCE_NOT_FOUND, 'en', { resource: 'User' });
   * // 如果消息模板是 'Resource {resource} not found'，则返回 'Resource User not found'
   * ```
   */
  public static getMessage(
    code: ErrorCode,
    language?: SupportedLanguage,
    params?: MessageParams,
  ): string {
    const lang = language || this.currentLanguage;
    const messages = ERROR_MESSAGES_I18N[lang];
    let message = messages?.[code] || ERROR_CODE_MESSAGES[code] || 'Internal Server Error';

    // 如果提供了参数，替换消息模板中的占位符
    if (params) {
      message = this.replaceTemplate(message, params);
    }

    return message;
  }

  /**
   * 替换消息模板中的占位符
   * @param template - 消息模板，使用 {key} 作为占位符
   * @param params - 参数对象
   * @returns 替换后的消息
   *
   * @example
   * ```ts
   * replaceTemplate('Resource {resource} not found', { resource: 'User' });
   * // 返回: 'Resource User not found'
   * ```
   */
  private static replaceTemplate(template: string, params: MessageParams): string {
    return template.replace(/\{(\w+)\}/g, (match, key) => {
      const value = params[key];
      return value !== undefined ? String(value) : match;
    });
  }

  /**
   * 从 Accept-Language 头解析语言
   * 支持的语言：en, zh-CN, ja, ko
   *
   * @param acceptLanguage - Accept-Language HTTP 头值
   * @returns 解析后的语言代码
   *
   * @example
   * ```ts
   * parseLanguageFromHeader('zh-CN,zh;q=0.9,en;q=0.8');
   * // 返回: 'zh-CN'
   * ```
   */
  public static parseLanguageFromHeader(acceptLanguage?: string | null): SupportedLanguage {
    if (!acceptLanguage) {
      return 'en';
    }

    const lowerAcceptLanguage = acceptLanguage.toLowerCase();

    // 按优先级检查语言
    if (lowerAcceptLanguage.includes('zh-cn') || lowerAcceptLanguage.includes('zh')) {
      return 'zh-CN';
    }
    if (lowerAcceptLanguage.includes('ja')) {
      return 'ja';
    }
    if (lowerAcceptLanguage.includes('ko')) {
      return 'ko';
    }

    return 'en';
  }
}

