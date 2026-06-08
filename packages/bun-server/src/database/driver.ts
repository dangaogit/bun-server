import type { DatabaseDriver, MysqlConfig, PostgresConfig } from './types';

/**
 * 已解析的具体驱动类型（连接级别 tag）
 * - `'bun-sql'`：Bun 内建 `Bun.SQL`
 * - `'mysql2'`：纯 JS `mysql2` 驱动
 * - `'postgres'`：纯 JS `postgres` 驱动
 */
export type ResolvedDriver = 'bun-sql' | 'mysql2' | 'postgres';

/**
 * 运行时引擎（来自 platform/runtime）
 */
export type RuntimeEngine = 'bun' | 'node';

/**
 * 连接级别的驱动 tag，附加在连接对象/函数上，
 * 让查询执行 / 健康检查 / 关闭逻辑统一按所选 driver 分流，
 * 而不是按 `getRuntime().engine` 分流。
 */
const DRIVER_TAG: unique symbol = Symbol.for('@dangao/bun-server:database:driver');

/**
 * 将驱动选项（含 'auto'）解析为具体驱动。
 *
 * - `'auto'`：Bun → `bun-sql`，Node → `mysql2`（MySQL）/ `postgres`（PostgreSQL），保持历史行为。
 * - `'bun-sql'`：强制 `Bun.SQL`，仅 Bun 合法，Node 抛清晰错误。
 * - `'mysql2'`：强制 `mysql2`，仅 `type: 'mysql'` 合法。
 * - `'postgres'`：强制 `postgres`，仅 `type: 'postgres'` 合法。
 *
 * @param dbType 数据库类型（postgres / mysql）
 * @param option 用户配置的 driver（默认 'auto'）
 * @param engine 当前运行时引擎
 */
export function resolveDriver(
  dbType: 'postgres' | 'mysql',
  option: DatabaseDriver | undefined,
  engine: RuntimeEngine,
): ResolvedDriver {
  const driver = option ?? 'auto';

  switch (driver) {
    case 'auto':
      if (engine === 'bun') {
        return 'bun-sql';
      }
      return dbType === 'mysql' ? 'mysql2' : 'postgres';

    case 'bun-sql':
      if (engine !== 'bun') {
        throw new Error(
          `[bun-server] driver 'bun-sql' requires the Bun runtime, but the current platform engine is '${engine}'. ` +
            `Use driver 'auto' / 'mysql2' / 'postgres', or run on Bun.`,
        );
      }
      return 'bun-sql';

    case 'mysql2':
      if (dbType !== 'mysql') {
        throw new Error(
          `[bun-server] driver 'mysql2' is only valid for type 'mysql', but got type '${dbType}'.`,
        );
      }
      return 'mysql2';

    case 'postgres':
      if (dbType !== 'postgres') {
        throw new Error(
          `[bun-server] driver 'postgres' is only valid for type 'postgres', but got type '${dbType}'.`,
        );
      }
      return 'postgres';

    default:
      throw new Error(`[bun-server] unknown driver '${String(driver)}'.`);
  }
}

/**
 * 给连接对象/函数打上驱动 tag（返回同一引用，保证池内 identity 比较不被破坏）。
 */
export function tagConnection<T>(connection: T, driver: ResolvedDriver): T {
  if (connection && (typeof connection === 'object' || typeof connection === 'function')) {
    try {
      Object.defineProperty(connection as object, DRIVER_TAG, {
        value: driver,
        enumerable: false,
        configurable: true,
        writable: true,
      });
    } catch {
      // 某些 frozen 连接无法附加 tag，回退到 heuristic 推断
    }
  }
  return connection;
}

/**
 * 读取连接 tag；若无显式 tag 则按结构启发式推断（向后兼容未打 tag 的连接，
 * 例如 `sql.reserve()` 返回的 reserved 连接）。
 */
export function getConnectionDriver(connection: unknown): ResolvedDriver | undefined {
  if (!connection) {
    return undefined;
  }
  if (typeof connection === 'object' || typeof connection === 'function') {
    const tagged = (connection as Record<symbol, unknown>)[DRIVER_TAG];
    if (tagged === 'bun-sql' || tagged === 'mysql2' || tagged === 'postgres') {
      return tagged;
    }
  }
  // heuristic 回退：可作为模板字符串调用的（Bun.SQL / postgres-js / reserved）按模板路径处理
  if (typeof connection === 'function') {
    return 'bun-sql';
  }
  return undefined;
}

/**
 * 创建 PostgreSQL 连接（按所选 driver 分流，并打 tag）。
 */
export async function createPostgresConnection(
  config: PostgresConfig,
  driver: ResolvedDriver,
): Promise<unknown> {
  const url = `postgres://${config.user}:${config.password}@${config.host}:${config.port}/${config.database}`;

  if (driver === 'bun-sql') {
    const { SQL } = await import('bun');
    return tagConnection(
      new SQL({
        adapter: 'postgres',
        hostname: config.host,
        port: config.port,
        username: config.user,
        password: config.password,
        database: config.database,
        max: 1,
        tls: config.ssl ?? false,
      } as unknown as string),
      'bun-sql',
    );
  }

  if (driver === 'postgres') {
    const postgres = loadPostgres();
    return tagConnection(
      postgres(url, { max: 1, ssl: config.ssl ? 'require' : false }),
      'postgres',
    );
  }

  throw new Error(`[bun-server] driver '${driver}' cannot create a postgres connection.`);
}

/**
 * 创建 MySQL 连接（按所选 driver 分流，并打 tag）。
 *
 * Bun.SQL 走 options-object 形式而非连接字符串，绕开 oven-sh/bun#26648
 * （MySQL 连接串被误判为 postgres）。
 */
export async function createMysqlConnection(
  config: MysqlConfig & { ssl?: boolean },
  driver: ResolvedDriver,
): Promise<unknown> {
  if (driver === 'bun-sql') {
    const { SQL } = await import('bun');
    return tagConnection(
      new SQL({
        adapter: 'mysql',
        hostname: config.host,
        port: config.port,
        username: config.user,
        password: config.password,
        database: config.database,
        max: 1,
        ssl: config.ssl ?? false,
      } as unknown as string),
      'bun-sql',
    );
  }

  if (driver === 'mysql2') {
    const mysql2 = loadMysql2();
    const conn = await mysql2.createConnection({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password,
    });
    return tagConnection(conn, 'mysql2');
  }

  throw new Error(`[bun-server] driver '${driver}' cannot create a mysql connection.`);
}

/**
 * 执行参数化查询（按连接 tag 分流），统一返回行数组。
 *
 * - `bun-sql`：通过模板字符串调用，参数走 Bun.SQL 的 values 通道。
 * - `mysql2`：`conn.query(sql, params)`，返回 `[rows, fields]`，取 rows。
 * - `postgres`：`sql.unsafe(sql, params)`，直接返回行数组。
 */
export async function queryViaDriver<T = unknown>(
  connection: unknown,
  sql: string,
  params?: unknown[],
): Promise<T[]> {
  const driver = getConnectionDriver(connection);

  if (driver === 'mysql2') {
    const conn = connection as {
      query: (sql: string, params?: unknown[]) => Promise<[unknown, unknown]>;
    };
    const [rows] = await conn.query(sql, params ?? []);
    return (rows ?? []) as T[];
  }

  if (driver === 'postgres') {
    const conn = connection as {
      unsafe: (sql: string, params?: unknown[]) => Promise<unknown[]>;
    };
    const rows = await conn.unsafe(sql, params ?? []);
    return (rows ?? []) as T[];
  }

  // bun-sql 及 heuristic 回退：模板字符串路径
  if (typeof connection === 'function') {
    const { strings, values } = buildTemplateFromSql(sql, params);
    const template = Object.assign(strings.slice(), {
      raw: strings.slice(),
    }) as unknown as TemplateStringsArray;
    const result = await (
      connection as (
        template: TemplateStringsArray,
        ...values: unknown[]
      ) => Promise<Array<Record<string, unknown>>>
    )(template, ...values);
    return result as T[];
  }

  // 对象但带 query 方法（兜底）
  if (
    connection &&
    typeof connection === 'object' &&
    'query' in connection &&
    typeof (connection as { query: unknown }).query === 'function'
  ) {
    const result = await (
      connection as {
        query: (sql: string, params?: unknown[]) => Promise<unknown>;
      }
    ).query(sql, params ?? []);
    return (Array.isArray(result) ? result[0] : result) as T[];
  }

  throw new Error('[bun-server] invalid SQL connection for query.');
}

/**
 * 通过 tagged template 执行查询（供 db proxy 使用），按连接 tag 分流。
 *
 * - `mysql2`：把模板片段拼成 `?` 占位 SQL，走 `conn.query(sql, values)`。
 * - 其余（bun-sql / postgres / reserved）：连接本身即可作为 tagged template 调用。
 */
export async function templateQueryViaDriver(
  connection: unknown,
  strings: TemplateStringsArray,
  values: unknown[],
): Promise<unknown> {
  const driver = getConnectionDriver(connection);

  if (driver === 'mysql2') {
    const sql = strings.join('?');
    const conn = connection as {
      query: (sql: string, params?: unknown[]) => Promise<[unknown, unknown]>;
    };
    const [rows] = await conn.query(sql, values);
    return rows;
  }

  return await (
    connection as (
      strings: TemplateStringsArray,
      ...values: unknown[]
    ) => Promise<unknown>
  )(strings, ...values);
}

/**
 * 健康检查（按连接 tag 分流）。
 */
export async function healthCheckViaDriver(connection: unknown): Promise<boolean> {
  try {
    const rows = await queryViaDriver(connection, 'SELECT 1');
    return Array.isArray(rows);
  } catch {
    return false;
  }
}

/**
 * 关闭连接（按连接 tag 分流）。
 *
 * - `bun-sql`：`.close()`
 * - `mysql2` / `postgres`：`.end()`
 * - 兜底：可用的 `.close()` 或 `.end()`
 */
export async function closeViaDriver(connection: unknown): Promise<void> {
  if (!connection || (typeof connection !== 'object' && typeof connection !== 'function')) {
    return;
  }

  const driver = getConnectionDriver(connection);
  const conn = connection as { close?: () => unknown; end?: () => unknown };

  if (driver === 'mysql2' || driver === 'postgres') {
    if (typeof conn.end === 'function') {
      await conn.end();
      return;
    }
  }

  if (driver === 'bun-sql') {
    if (typeof conn.close === 'function') {
      await conn.close();
      return;
    }
  }

  // 兜底
  if (typeof conn.close === 'function') {
    await conn.close();
  } else if (typeof conn.end === 'function') {
    await conn.end();
  }
}

/**
 * 将 `SELECT ... ?` 占位符 SQL + 参数转换为模板字符串片段，
 * 让参数通过 Bun.SQL 的 values 通道注入。
 */
export function buildTemplateFromSql(
  sql: string,
  params?: unknown[],
): { strings: string[]; values: unknown[] } {
  if (!params || params.length === 0) {
    return { strings: [sql], values: [] };
  }

  const strings = sql.split('?');
  if (strings.length !== params.length + 1) {
    throw new Error('SQL placeholders count does not match parameters count');
  }

  return { strings, values: params };
}

function loadMysql2(): typeof import('mysql2/promise') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('mysql2/promise') as typeof import('mysql2/promise');
}

function loadPostgres(): typeof import('postgres') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('postgres') as typeof import('postgres');
}
