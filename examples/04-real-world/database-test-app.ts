/**
 * 数据库连接测试工具
 * 
 * 功能：
 * 1. 提供 Web UI 页面，手动填写数据库连接信息
 * 2. 支持 PostgreSQL 和 MySQL 连接测试
 * 3. 提供一系列自动化功能检查按钮
 * 4. 动态创建和测试数据库连接
 */

import {
  Application,
  Controller,
  GET,
  POST,
  Body,
  ConfigModule,
  LoggerModule,
  LogLevel,
  Module,
  DatabaseModule,
  DatabaseService,
  DATABASE_SERVICE_TOKEN,
  ModuleRegistry,
  Container,
  type DatabaseConfig,
} from '@dangao/bun-server';

// 配置基础模块
ConfigModule.forRoot({
  defaultConfig: { app: { name: 'Database Test Tool', port: 3000 } },
});

LoggerModule.forRoot({
  logger: {
    level: LogLevel.INFO,
    prefix: 'DB-Test',
  },
});

// 存储当前数据库服务实例和连接
let currentDatabaseService: DatabaseService | null = null;
let currentContainer: Container | null = null;
let currentSqlConnection: any = null; // Bun.SQL 连接实例

/**
 * HTML 页面内容
 */
const HTML_PAGE = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>数据库连接测试工具</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 20px;
    }
    .container {
      max-width: 900px;
      margin: 0 auto;
      background: white;
      border-radius: 12px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      text-align: center;
    }
    .header h1 {
      font-size: 28px;
      margin-bottom: 10px;
    }
    .header p {
      opacity: 0.9;
      font-size: 14px;
    }
    .content {
      padding: 30px;
    }
    .form-group {
      margin-bottom: 20px;
    }
    .form-group label {
      display: block;
      margin-bottom: 8px;
      font-weight: 600;
      color: #333;
      font-size: 14px;
    }
    .form-group input,
    .form-group select {
      width: 100%;
      padding: 12px;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      font-size: 14px;
      transition: border-color 0.3s;
    }
    .form-group input:focus,
    .form-group select:focus {
      outline: none;
      border-color: #667eea;
    }
    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
    }
    .btn {
      padding: 12px 24px;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s;
      margin-right: 10px;
      margin-bottom: 10px;
    }
    .btn-primary {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }
    .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
    }
    .btn-success {
      background: #10b981;
      color: white;
    }
    .btn-success:hover {
      background: #059669;
      transform: translateY(-2px);
    }
    .btn-danger {
      background: #ef4444;
      color: white;
    }
    .btn-danger:hover {
      background: #dc2626;
      transform: translateY(-2px);
    }
    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      transform: none !important;
    }
    .result {
      margin-top: 20px;
      padding: 15px;
      border-radius: 8px;
      display: none;
    }
    .result.success {
      background: #d1fae5;
      border: 2px solid #10b981;
      color: #065f46;
    }
    .result.error {
      background: #fee2e2;
      border: 2px solid #ef4444;
      color: #991b1b;
    }
    .result.show {
      display: block;
    }
    .result pre {
      margin-top: 10px;
      padding: 10px;
      background: rgba(0,0,0,0.05);
      border-radius: 4px;
      overflow-x: auto;
      font-size: 12px;
    }
    .actions {
      margin-top: 20px;
      padding-top: 20px;
      border-top: 2px solid #e0e0e0;
    }
    .actions h3 {
      margin-bottom: 15px;
      color: #333;
    }
    .loading {
      display: inline-block;
      width: 16px;
      height: 16px;
      border: 2px solid #ffffff;
      border-top-color: transparent;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
      margin-left: 8px;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🗄️ 数据库连接测试工具</h1>
      <p>支持 PostgreSQL 和 MySQL 数据库连接测试</p>
    </div>
    <div class="content">
      <form id="connectionForm">
        <div class="form-group">
          <label>数据库类型</label>
          <select id="dbType" name="type" required>
            <option value="postgres">PostgreSQL</option>
            <option value="mysql">MySQL</option>
          </select>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>主机地址</label>
            <input type="text" id="host" name="host" placeholder="localhost" required>
          </div>
          <div class="form-group">
            <label>端口</label>
            <input type="number" id="port" name="port" placeholder="5432" required>
          </div>
        </div>
        <div class="form-group">
          <label>数据库名称</label>
          <input type="text" id="database" name="database" placeholder="testdb" required>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>用户名</label>
            <input type="text" id="user" name="user" placeholder="postgres" required>
          </div>
          <div class="form-group">
            <label>密码</label>
            <input type="password" id="password" name="password" placeholder="password" required>
          </div>
        </div>
        <button type="submit" class="btn btn-primary" id="connectBtn">
          连接数据库
        </button>
      </form>

      <div id="result" class="result"></div>

      <div class="actions" id="actions" style="display: none;">
        <h3>功能检查</h3>
        <button class="btn btn-success" onclick="testConnection()">✅ 连接测试</button>
        <button class="btn btn-success" onclick="testQuery()">📊 查询测试</button>
        <button class="btn btn-success" onclick="testTransaction()">🔄 事务测试</button>
        <button class="btn btn-success" onclick="testHealthCheck()">🏥 健康检查</button>
        <button class="btn btn-success" onclick="testPoolStats()">📈 连接池统计</button>
        <button class="btn btn-danger" onclick="disconnect()">❌ 断开连接</button>
      </div>
    </div>
  </div>

  <script>
    let connected = false;

    document.getElementById('connectionForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('connectBtn');
      const originalText = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = originalText + '<span class="loading"></span>';

      const formData = {
        type: document.getElementById('dbType').value,
        host: document.getElementById('host').value,
        port: parseInt(document.getElementById('port').value),
        database: document.getElementById('database').value,
        user: document.getElementById('user').value,
        password: document.getElementById('password').value,
      };

      try {
        const response = await fetch('/api/connect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });

        const result = await response.json();
        showResult(result.success, result.message || result.error, result.data);
        
        if (result.success) {
          connected = true;
          document.getElementById('actions').style.display = 'block';
        }
      } catch (error) {
        showResult(false, '连接失败: ' + error.message);
      } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
      }
    });

    async function testConnection() {
      await callApi('/api/test/connection', '连接测试');
    }

    async function testQuery() {
      await callApi('/api/test/query', '查询测试');
    }

    async function testTransaction() {
      await callApi('/api/test/transaction', '事务测试');
    }

    async function testHealthCheck() {
      await callApi('/api/test/health', '健康检查');
    }

    async function testPoolStats() {
      await callApi('/api/test/pool-stats', '连接池统计');
    }

    async function disconnect() {
      await callApi('/api/disconnect', '断开连接', () => {
        connected = false;
        document.getElementById('actions').style.display = 'none';
      });
    }

    async function callApi(endpoint, actionName, callback) {
      const resultDiv = document.getElementById('result');
      resultDiv.className = 'result';
      resultDiv.innerHTML = \`<strong>\${actionName}中...</strong>\`;
      resultDiv.classList.add('show');

      try {
        const response = await fetch(endpoint, { method: 'POST' });
        const result = await response.json();
        showResult(result.success, result.message || result.error, result.data);
        if (callback) callback();
      } catch (error) {
        showResult(false, \`\${actionName}失败: \${error.message}\`);
      }
    }

    function showResult(success, message, data) {
      const resultDiv = document.getElementById('result');
      resultDiv.className = \`result \${success ? 'success' : 'error'}\`;
      resultDiv.classList.add('show');
      
      let html = \`<strong>\${success ? '✅ 成功' : '❌ 失败'}</strong><br>\${message}\`;
      if (data) {
        html += \`<pre>\${JSON.stringify(data, null, 2)}\</pre>\`;
      }
      resultDiv.innerHTML = html;
    }
  </script>
</body>
</html>`;

@Controller('/')
class PageController {
  @GET('/')
  public getPage() {
    return new Response(HTML_PAGE, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    });
  }
}

@Controller('/api')
class ApiController {
  /**
   * 连接数据库
   */
  @POST('/connect')
  public async connect(@Body() body: {
    type: 'postgres' | 'mysql';
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
  }) {
    try {
      // 关闭之前的连接
      if (currentDatabaseService) {
        try {
          await currentDatabaseService.closePool();
        } catch (e) {
          // 忽略关闭错误
        }
      }

      // 构建数据库配置
      const dbConfig: DatabaseConfig =
        body.type === 'postgres'
          ? {
              type: 'postgres',
              config: {
                host: body.host,
                port: body.port,
                database: body.database,
                user: body.user,
                password: body.password,
              },
            }
          : {
              type: 'mysql',
              config: {
                host: body.host,
                port: body.port,
                database: body.database,
                user: body.user,
                password: body.password,
              },
            };

      // 清除之前的模块元数据（如果存在）
      const MODULE_METADATA_KEY = Symbol.for('@dangao/bun-server:module');
      Reflect.deleteMetadata(MODULE_METADATA_KEY, DatabaseModule);

      // 配置数据库模块
      DatabaseModule.forRoot({
        database: dbConfig,
        pool: {
          maxConnections: 10,
          connectionTimeout: 30000,
          retryCount: 3,
          retryDelay: 1000,
        },
        enableHealthCheck: true,
      });

      // 创建新的容器
      const container = new Container();

      // 手动创建并注册数据库服务（不通过 ModuleRegistry，避免缓存问题）
      const dbService = new DatabaseService({
        database: dbConfig,
        pool: {
          maxConnections: 10,
          connectionTimeout: 30000,
          retryCount: 3,
          retryDelay: 1000,
        },
        enableHealthCheck: true,
      });

      // 手动注册到容器
      container.registerInstance(DATABASE_SERVICE_TOKEN, dbService);
      container.registerInstance(DatabaseService, dbService);

      // 初始化连接
      await dbService.initialize();

      // 保存当前服务实例和连接
      currentDatabaseService = dbService;
      currentContainer = container;
      // 获取 Bun.SQL 连接实例（用于模板字符串查询）
      currentSqlConnection = dbService.getConnection();

      const connectionInfo = dbService.getConnectionInfo();

      return {
        success: true,
        message: `成功连接到 ${body.type.toUpperCase()} 数据库`,
        data: {
          type: body.type,
          host: body.host,
          port: body.port,
          database: body.database,
          connectionInfo,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || '连接失败',
        details: error.stack,
      };
    }
  }

  /**
   * 测试连接
   */
  @POST('/test/connection')
  public async testConnection() {
    if (!currentDatabaseService) {
      return {
        success: false,
        error: '请先连接数据库',
      };
    }

    try {
      const connectionInfo = currentDatabaseService.getConnectionInfo();
      const dbType = currentDatabaseService.getDatabaseType();

      return {
        success: true,
        message: '连接正常',
        data: {
          type: dbType,
          connectionInfo,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || '连接测试失败',
      };
    }
  }

  /**
   * 测试查询
   */
  @POST('/test/query')
  public async testQuery() {
    if (!currentDatabaseService || !currentSqlConnection) {
      return {
        success: false,
        error: '请先连接数据库',
      };
    }

    try {
      const dbType = currentDatabaseService.getDatabaseType();

      // 使用 Bun.SQL 模板字符串语法执行查询
      let result: any[];
      if (dbType === 'postgres') {
        // PostgreSQL 查询
        result = await currentSqlConnection`
          SELECT version() as version, current_database() as database, current_user as user
        `;
      } else if (dbType === 'mysql') {
        // MySQL 查询（使用反引号包裹列别名，避免与保留字冲突）
        result = await currentSqlConnection`
          SELECT VERSION() as version, DATABASE() as \`database\`, USER() as \`user\`
        `;
      } else {
        // SQLite 查询（使用 DatabaseService）
        result = await currentDatabaseService.query('SELECT 1 as test');
      }

      return {
        success: true,
        message: '查询测试成功',
        data: {
          query: dbType === 'postgres' 
            ? 'SELECT version() as version, current_database() as database, current_user as user'
            : dbType === 'mysql'
            ? 'SELECT VERSION() as version, DATABASE() as `database`, USER() as `user`'
            : 'SELECT 1 as test',
          result,
        },
      };
    } catch (error: any) {
      const errorMsg = error?.message || String(error);
      const errorStack = error?.stack ? String(error.stack).substring(0,500) : 'No stack';
      return {
        success: false,
        error: errorMsg || '查询测试失败',
        details: errorStack,
      };
    }
  }

  /**
   * 测试事务
   */
  @POST('/test/transaction')
  public async testTransaction() {
    if (!currentDatabaseService) {
      return {
        success: false,
        error: '请先连接数据库',
      };
    }

    try {
      const dbType = currentDatabaseService.getDatabaseType();

      if (dbType === 'sqlite') {
        return {
          success: false,
          error: 'SQLite 不支持事务测试',
        };
      }

      // 测试事务回滚（使用 Bun.SQL 模板字符串）
      if (!currentSqlConnection) {
        return {
          success: false,
          error: 'SQL 连接不可用',
        };
      }

      // 创建测试表（使用 Bun.SQL 模板字符串）
      if (dbType === 'postgres') {
        await currentSqlConnection`
          CREATE TABLE IF NOT EXISTS test_transaction (
            id SERIAL PRIMARY KEY,
            value TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `;
      } else if (dbType === 'mysql') {
        await currentSqlConnection`
          CREATE TABLE IF NOT EXISTS test_transaction (
            id INT AUTO_INCREMENT PRIMARY KEY,
            value TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `;
      }

      try {
        // 先清理测试数据
        await currentSqlConnection`
          DELETE FROM test_transaction WHERE value = ${'test-rollback'}
        `;

        // 开始事务并插入数据，然后回滚（使用 Bun.SQL 模板字符串）
        await currentSqlConnection`START TRANSACTION`;
        await currentSqlConnection`
          INSERT INTO test_transaction (value) VALUES (${'test-rollback'})
        `;
        await currentSqlConnection`ROLLBACK`;

        // 验证数据未插入（使用 Bun.SQL 模板字符串）
        const checkResult = await currentSqlConnection`
          SELECT COUNT(*) as count FROM test_transaction WHERE value = ${'test-rollback'}
        ` as Array<{ count: number | string }>;
        // 处理不同数据库返回的 count 类型（可能是数字或字符串）
        const countValue = Array.isArray(checkResult) && checkResult.length > 0
          ? checkResult[0]?.count
          : 0;
        const count = typeof countValue === 'string' ? parseInt(countValue, 10) : (countValue || 0);

        if (count === 0) {
          return {
            success: true,
            message: '事务回滚测试成功',
            data: {
              test: 'rollback',
              result: '数据已正确回滚',
              count: 0,
            },
          };
        } else {
          return {
            success: false,
            error: '事务回滚失败，数据未被回滚',
            data: { count },
          };
        }
      } catch (error: any) {
        return {
          success: false,
          error: error.message || '事务测试失败',
          details: error.stack,
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || '事务测试失败',
      };
    }
  }

  /**
   * 健康检查
   */
  @POST('/test/health')
  public async testHealthCheck() {
    if (!currentDatabaseService) {
      return {
        success: false,
        error: '请先连接数据库',
      };
    }

    try {
      const isHealthy = await currentDatabaseService.healthCheck();
      const connectionInfo = currentDatabaseService.getConnectionInfo();

      return {
        success: isHealthy,
        message: isHealthy ? '数据库连接健康' : '数据库连接异常',
        data: {
          healthy: isHealthy,
          connectionInfo,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || '健康检查失败',
      };
    }
  }

  /**
   * 连接池统计
   */
  @POST('/test/pool-stats')
  public async testPoolStats() {
    if (!currentDatabaseService) {
      return {
        success: false,
        error: '请先连接数据库',
      };
    }

    try {
      const stats = currentDatabaseService.getPoolStats();

      return {
        success: true,
        message: '连接池统计信息',
        data: stats,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || '获取连接池统计失败',
      };
    }
  }

  /**
   * 断开连接
   */
  @POST('/disconnect')
  public async disconnect() {
    if (!currentDatabaseService) {
      return {
        success: false,
        error: '没有活动的数据库连接',
      };
    }

    try {
      await currentDatabaseService.closePool();
      currentDatabaseService = null;
      currentContainer = null;
      currentSqlConnection = null;

      return {
        success: true,
        message: '已断开数据库连接',
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || '断开连接失败',
      };
    }
  }
}

@Module({
  controllers: [PageController, ApiController],
})
class AppModule {}

// 创建应用
const app = new Application({
  port: 3000,
});

// 注册模块
app.registerModule(ConfigModule);
app.registerModule(LoggerModule);
app.registerModule(AppModule);

// 启动应用
(async () => {
  await app.listen();
  console.log('🚀 数据库测试工具已启动');
  console.log('📱 访问 http://localhost:3000 使用 Web UI');
  console.log('\n功能说明:');
  console.log('  1. 填写数据库连接信息（PostgreSQL 或 MySQL）');
  console.log('  2. 点击"连接数据库"建立连接');
  console.log('  3. 使用功能检查按钮测试各项功能');
  console.log('  4. 测试完成后点击"断开连接"');
})();
