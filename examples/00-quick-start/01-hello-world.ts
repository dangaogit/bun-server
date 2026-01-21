/**
 * Hello World - 最简示例
 * 
 * 这是一个最简单的 Bun Server 应用，只需 5 行代码即可启动一个 HTTP 服务器。
 * 
 * 运行方式：
 *   bun run examples/00-quick-start/01-hello-world.ts
 * 
 * 测试：
 *   curl http://localhost:3000
 */

import { Application, Controller, GET } from '@dangao/bun-server';

// 1. 定义控制器
@Controller('/')
class HelloController {
  @GET('/')
  public hello() {
    return { message: 'Hello, Bun Server!' };
  }
}

// 2. 创建应用
const app = new Application({ port: 3000 });

// 3. 注册控制器
app.registerController(HelloController);

// 4. 启动服务器
app.listen();

console.log('🚀 Server running on http://localhost:3000');
console.log('\n🧪 Try it with curl:');
console.log('  curl http://localhost:3000');
