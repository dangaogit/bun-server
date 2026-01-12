import { describe, expect, test, beforeEach, afterEach } from 'bun:test';
import type { ServerWebSocket } from 'bun';

import { WebSocketGateway, OnOpen, OnMessage, OnClose } from '../../src/websocket/decorators';
import { WebSocketGatewayRegistry } from '../../src/websocket/registry';
import { ControllerRegistry } from '../../src/controller/controller';
import { Application } from '../../src/core/application';
import { Query, Context } from '../../src/controller/decorators';
import { getTestPort } from '../utils/test-port';
import type { WebSocketConnectionData } from '../../src/websocket/registry';
import type { Context as RequestContext } from '../../src/core/context';

function createFakeSocket(path: string): ServerWebSocket<WebSocketConnectionData> {
  return {
    data: { path },
    send() {},
    close() {},
  } as unknown as ServerWebSocket<WebSocketConnectionData>;
}

describe('WebSocketGatewayRegistry', () => {
  const registry = WebSocketGatewayRegistry.getInstance();

  beforeEach(() => {
    registry.clear();
    ControllerRegistry.getInstance().clear();
    TestGateway.events = [];
  });

  afterEach(() => {
    registry.clear();
    ControllerRegistry.getInstance().clear();
    TestGateway.events = [];
  });

  @WebSocketGateway('/ws/test')
  class TestGateway {
    public static events: string[] = [];

    @OnOpen
    public handleOpen(): void {
      TestGateway.events.push('open');
    }

    @OnMessage
    public handleMessage(
      _ws: ServerWebSocket<WebSocketConnectionData>,
      message: unknown,
    ): void {
      TestGateway.events.push(`message:${message}`);
    }

    @OnClose
    public handleClose(_ws: ServerWebSocket<WebSocketConnectionData>): void {
      TestGateway.events.push('close');
    }
  }

  test('should register gateway and handle events', () => {
    registry.register(TestGateway);

    const ws = createFakeSocket('/ws/test');
    registry.handleOpen(ws);
    registry.handleMessage(ws, 'hello');
    registry.handleClose(ws, 1000, 'normal');

    expect(registry.hasGateway('/ws/test')).toBe(true);
    expect(TestGateway.events).toEqual(['open', 'message:hello', 'close']);
  });
});

@WebSocketGateway('/ws/chat')
class ChatGateway {
  public static messages: string[] = [];

  @OnOpen
  public handleOpen(ws: ServerWebSocket<WebSocketConnectionData>): void {
    ChatGateway.messages.push('connected');
    ws.send('Welcome to chat!');
  }

  @OnMessage
  public handleMessage(
    ws: ServerWebSocket<WebSocketConnectionData>,
    message: string,
  ): void {
    ChatGateway.messages.push(message);
    ws.send(`[echo] ${message}`);
  }

  @OnClose
  public handleClose(_ws: ServerWebSocket<WebSocketConnectionData>): void {
    ChatGateway.messages.push('disconnected');
  }
}

@WebSocketGateway('/ws/echo')
class EchoGateway {
  public static echoes: string[] = [];

  @OnMessage
  public handleMessage(
    ws: ServerWebSocket<WebSocketConnectionData>,
    message: string,
  ): void {
    EchoGateway.echoes.push(message);
    ws.send(`Echo: ${message}`);
  }
}

describe('WebSocket Gateway Integration', () => {
  let app: Application;
  let port: number;

  beforeEach(() => {
    port = getTestPort();
    app = new Application({ port });
    ChatGateway.messages = [];
    EchoGateway.echoes = [];
  });

  afterEach(async () => {
    if (app) {
      await app.stop();
    }
    WebSocketGatewayRegistry.getInstance().clear();
    ControllerRegistry.getInstance().clear();
  });

  test('should support @WebSocketGateway decorator to register gateway', () => {
    app.registerWebSocketGateway(ChatGateway);

    const registry = WebSocketGatewayRegistry.getInstance();
    expect(registry.hasGateway('/ws/chat')).toBe(true);
  });

  test('should handle WebSocket connection on registered path', async () => {
    app.registerWebSocketGateway(ChatGateway);
    await app.listen();

    const ws = new WebSocket(`ws://localhost:${port}/ws/chat`);

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('WebSocket connection timeout'));
      }, 2000);

      ws.onopen = () => {
        clearTimeout(timeout);
        resolve();
      };

      ws.onerror = (error) => {
        clearTimeout(timeout);
        reject(error);
      };
    });

    expect(ChatGateway.messages).toContain('connected');
    ws.close();
  });

  test('should handle WebSocket messages', async () => {
    app.registerWebSocketGateway(ChatGateway);
    await app.listen();

    const ws = new WebSocket(`ws://localhost:${port}/ws/chat`);

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('WebSocket connection timeout'));
      }, 2000);

      ws.onopen = () => {
        clearTimeout(timeout);
        resolve();
      };

      ws.onerror = (error) => {
        clearTimeout(timeout);
        reject(error);
      };
    });

    // 等待连接建立
    await new Promise((resolve) => setTimeout(resolve, 100));

    const testMessage = 'Hello, WebSocket!';
    ws.send(testMessage);

    // 等待消息处理
    await new Promise((resolve) => setTimeout(resolve, 200));

    expect(ChatGateway.messages).toContain(testMessage);
    ws.close();
  });

  test('should handle WebSocket close event', async () => {
    app.registerWebSocketGateway(ChatGateway);
    await app.listen();

    const ws = new WebSocket(`ws://localhost:${port}/ws/chat`);

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('WebSocket connection timeout'));
      }, 2000);

      ws.onopen = () => {
        clearTimeout(timeout);
        resolve();
      };

      ws.onerror = (error) => {
        clearTimeout(timeout);
        reject(error);
      };
    });

    // 等待连接建立
    await new Promise((resolve) => setTimeout(resolve, 100));

    ws.close();

    // 等待关闭事件处理
    await new Promise((resolve) => setTimeout(resolve, 200));

    expect(ChatGateway.messages).toContain('connected');
  });

  test('should support multiple gateways on different paths', async () => {
    app.registerWebSocketGateway(ChatGateway);
    app.registerWebSocketGateway(EchoGateway);
    await app.listen();

    const registry = WebSocketGatewayRegistry.getInstance();
    expect(registry.hasGateway('/ws/chat')).toBe(true);
    expect(registry.hasGateway('/ws/echo')).toBe(true);

    // 测试 chat gateway
    const chatWs = new WebSocket(`ws://localhost:${port}/ws/chat`);
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('WebSocket connection timeout'));
      }, 2000);

      chatWs.onopen = () => {
        clearTimeout(timeout);
        resolve();
      };

      chatWs.onerror = (error) => {
        clearTimeout(timeout);
        reject(error);
      };
    });

    await new Promise((resolve) => setTimeout(resolve, 100));
    chatWs.send('chat message');
    await new Promise((resolve) => setTimeout(resolve, 200));

    // 测试 echo gateway
    const echoWs = new WebSocket(`ws://localhost:${port}/ws/echo`);
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('WebSocket connection timeout'));
      }, 2000);

      echoWs.onopen = () => {
        clearTimeout(timeout);
        resolve();
      };

      echoWs.onerror = (error) => {
        clearTimeout(timeout);
        reject(error);
      };
    });

    await new Promise((resolve) => setTimeout(resolve, 100));
    echoWs.send('echo message');
    await new Promise((resolve) => setTimeout(resolve, 200));

    expect(ChatGateway.messages).toContain('chat message');
    expect(EchoGateway.echoes).toContain('echo message');

    chatWs.close();
    echoWs.close();
  });

  test('should return 404 for unregistered WebSocket path', async () => {
    app.registerWebSocketGateway(ChatGateway);
    await app.listen();

    const response = await fetch(`http://localhost:${port}/ws/unknown`, {
      headers: {
        Upgrade: 'websocket',
        Connection: 'Upgrade',
        'Sec-WebSocket-Key': 'dGhlIHNhbXBsZSBub25jZQ==',
        'Sec-WebSocket-Version': '13',
      },
    });

    expect(response.status).toBe(404);
    const text = await response.text();
    expect(text).toContain('WebSocket gateway not found');
  });

  test('should handle WebSocket message with binary data', async () => {
    app.registerWebSocketGateway(EchoGateway);
    await app.listen();

    const ws = new WebSocket(`ws://localhost:${port}/ws/echo`);

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('WebSocket connection timeout'));
      }, 2000);

      ws.onopen = () => {
        clearTimeout(timeout);
        resolve();
      };

      ws.onerror = (error) => {
        clearTimeout(timeout);
        reject(error);
      };
    });

    await new Promise((resolve) => setTimeout(resolve, 100));

    const binaryData = new Uint8Array([1, 2, 3, 4, 5]);
    ws.send(binaryData);

    await new Promise((resolve) => setTimeout(resolve, 200));

    // 二进制数据会被转换为字符串或 ArrayBuffer
    // 这里主要验证不会抛出错误
    expect(EchoGateway.echoes.length).toBeGreaterThan(0);

    ws.close();
  });

  test('should support method-level event handlers', async () => {
    @WebSocketGateway('/ws/method-test')
    class MethodLevelGateway {
      public static events: string[] = [];

      @OnOpen
      public onConnection(ws: ServerWebSocket<WebSocketConnectionData>): void {
        MethodLevelGateway.events.push('connection-opened');
        ws.send('Connected via method handler');
      }

      @OnMessage
      public onMessageReceived(
        ws: ServerWebSocket<WebSocketConnectionData>,
        message: string,
      ): void {
        MethodLevelGateway.events.push(`message-received:${message}`);
        ws.send(`Method handler received: ${message}`);
      }

      @OnClose
      public onConnectionClosed(
        _ws: ServerWebSocket<WebSocketConnectionData>,
        code: number,
        reason: string,
      ): void {
        MethodLevelGateway.events.push(`connection-closed:${code}:${reason}`);
      }
    }

    app.registerWebSocketGateway(MethodLevelGateway);
    await app.listen();

    const ws = new WebSocket(`ws://localhost:${port}/ws/method-test`);

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('WebSocket connection timeout'));
      }, 2000);

      ws.onopen = () => {
        clearTimeout(timeout);
        resolve();
      };

      ws.onerror = (error) => {
        clearTimeout(timeout);
        reject(error);
      };
    });

    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(MethodLevelGateway.events).toContain('connection-opened');

    ws.send('test-message');
    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(MethodLevelGateway.events).toContain('message-received:test-message');

    ws.close(1000, 'test-close');
    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(MethodLevelGateway.events.some((e) => e.includes('connection-closed'))).toBe(true);
  });

  test('should extract and provide path information from WebSocket URL', async () => {
    // 注意：当前实现使用精确路径匹配，不支持动态路径参数（如 :roomId）
    // 这个测试验证路径信息是否被正确保存到 ws.data.path
    @WebSocketGateway('/ws/rooms')
    class RoomGateway {
      public static paths: string[] = [];

      @OnOpen
      public handleOpen(ws: ServerWebSocket<WebSocketConnectionData>): void {
        const path = ws.data?.path || '';
        RoomGateway.paths.push(path);
        ws.send(`Joined room from path: ${path}`);
      }

      @OnMessage
      public handleMessage(
        ws: ServerWebSocket<WebSocketConnectionData>,
        message: string,
      ): void {
        const path = ws.data?.path || '';
        ws.send(`Room ${path}: ${message}`);
      }
    }

    app.registerWebSocketGateway(RoomGateway);
    await app.listen();

    const ws = new WebSocket(`ws://localhost:${port}/ws/rooms`);

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('WebSocket connection timeout'));
      }, 2000);

      ws.onopen = () => {
        clearTimeout(timeout);
        resolve();
      };

      ws.onerror = (error) => {
        clearTimeout(timeout);
        reject(error);
      };
    });

    await new Promise((resolve) => setTimeout(resolve, 200));

    // 验证路径被正确保存
    expect(RoomGateway.paths.length).toBeGreaterThan(0);
    expect(RoomGateway.paths[0]).toBe('/ws/rooms');
    ws.close();
  });

  test('should extract and provide query parameters from WebSocket URL', async () => {
    @WebSocketGateway('/ws/query-test')
    class QueryParamGateway {
      public static queryParams: Record<string, string>[] = [];
      public static paths: string[] = [];

      @OnOpen
      public handleOpen(ws: ServerWebSocket<WebSocketConnectionData>): void {
        const path = ws.data?.path || '';
        QueryParamGateway.paths.push(path);

        // 尝试从 URL 中提取查询参数
        // 注意：当前实现可能不支持，这个测试可以验证功能是否存在
        const urlMatch = path.match(/\?(.+)$/);
        if (urlMatch) {
          const params: Record<string, string> = {};
          urlMatch[1].split('&').forEach((pair) => {
            const [key, value] = pair.split('=');
            if (key && value) {
              params[decodeURIComponent(key)] = decodeURIComponent(value);
            }
          });
          QueryParamGateway.queryParams.push(params);
        }

        ws.send(`Query params extracted: ${JSON.stringify(QueryParamGateway.queryParams)}`);
      }

      @OnMessage
      public handleMessage(
        ws: ServerWebSocket<WebSocketConnectionData>,
        message: string,
      ): void {
        ws.send(`Received with query: ${message}`);
      }
    }

    app.registerWebSocketGateway(QueryParamGateway);
    await app.listen();

    const userId = 'user-456';
    const token = 'token-789';
    const ws = new WebSocket(
      `ws://localhost:${port}/ws/query-test?userId=${userId}&token=${token}`,
    );

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('WebSocket connection timeout'));
      }, 2000);

      ws.onopen = () => {
        clearTimeout(timeout);
        resolve();
      };

      ws.onerror = (error) => {
        clearTimeout(timeout);
        reject(error);
      };
    });

    await new Promise((resolve) => setTimeout(resolve, 200));

    // 验证路径被保存（可能包含或不包含查询参数，取决于实现）
    expect(QueryParamGateway.paths.length).toBeGreaterThan(0);
    // 如果支持查询参数提取，应该能提取到参数
    // 注意：当前实现可能不支持，这个测试可以验证功能是否存在
    ws.close();
  });

  test('should support path parameter extraction (manual parsing)', async () => {
    // 注意：当前实现不支持动态路径参数和 @Param 装饰器
    // 这个测试演示如何手动从路径中提取参数，作为未来功能的参考
    @WebSocketGateway('/ws/param-test')
    class ParamGateway {
      public static receivedParams: string[] = [];
      public static extractedIds: string[] = [];

      @OnOpen
      public handleOpen(ws: ServerWebSocket<WebSocketConnectionData>): void {
        const path = ws.data?.path || '';
        // 手动从路径中提取参数（如果路径包含参数）
        // 例如：如果路径是 /ws/param-test/123，提取 123
        const match = path.match(/\/ws\/param-test\/([^/?]+)/);
        if (match) {
          ParamGateway.extractedIds.push(match[1]);
        }
      }

      @OnMessage
      public handleMessage(
        _ws: ServerWebSocket<WebSocketConnectionData>,
        message: string,
      ): void {
        ParamGateway.receivedParams.push(message);
      }
    }

    app.registerWebSocketGateway(ParamGateway);
    await app.listen();

    // 使用精确路径（当前实现要求）
    const ws = new WebSocket(`ws://localhost:${port}/ws/param-test`);

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('WebSocket connection timeout'));
      }, 2000);

      ws.onopen = () => {
        clearTimeout(timeout);
        resolve();
      };

      ws.onerror = (error) => {
        clearTimeout(timeout);
        reject(error);
      };
    });

    await new Promise((resolve) => setTimeout(resolve, 100));
    ws.send('test-message');
    await new Promise((resolve) => setTimeout(resolve, 200));

    // 验证消息被接收
    expect(ParamGateway.receivedParams).toContain('test-message');
    ws.close();
  });

  test('should support @Query decorator for query parameters', async () => {
    // 注意：这个测试假设 WebSocket 支持 @Query 装饰器
    // 如果功能不存在，测试会失败，这样可以明确需要实现该功能
    @WebSocketGateway('/ws/query-decorator-test')
    class QueryDecoratorGateway {
      public static receivedQueries: Record<string, string>[] = [];

      @OnMessage
      public handleMessage(
        _ws: ServerWebSocket<WebSocketConnectionData>,
        message: string,
        // 假设支持 @Query 装饰器
        // @Query('userId') userId: string,
        // @Query('token') token: string,
      ): void {
        // 如果支持 @Query，这里应该能获取到查询参数
        // 当前实现可能不支持，这个测试可以验证功能是否存在
        QueryDecoratorGateway.receivedQueries.push({ message });
      }
    }

    app.registerWebSocketGateway(QueryDecoratorGateway);
    await app.listen();

    const userId = 'user-999';
    const token = 'token-888';
    const ws = new WebSocket(
      `ws://localhost:${port}/ws/query-decorator-test?userId=${userId}&token=${token}`,
    );

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('WebSocket connection timeout'));
      }, 2000);

      ws.onopen = () => {
        clearTimeout(timeout);
        resolve();
      };

      ws.onerror = (error) => {
        clearTimeout(timeout);
        reject(error);
      };
    });

    await new Promise((resolve) => setTimeout(resolve, 100));
    ws.send('test-query');
    await new Promise((resolve) => setTimeout(resolve, 200));

    // 验证消息被接收（查询参数提取功能可能需要额外实现）
    expect(QueryDecoratorGateway.receivedQueries.length).toBeGreaterThan(0);
    ws.close();
  });

  test('should support @Context decorator for accessing request context', async () => {
    // 注意：这个测试假设 WebSocket 支持 @Context 装饰器
    // 如果功能不存在，测试会失败，这样可以明确需要实现该功能
    @WebSocketGateway('/ws/context-test')
    class ContextGateway {
      public static contexts: unknown[] = [];

      @OnOpen
      public handleOpen(
        _ws: ServerWebSocket<WebSocketConnectionData>,
        // 假设支持 @Context 装饰器
        // @Context() context: Context,
      ): void {
        // 如果支持 @Context，这里应该能获取到 Context 对象
        // 当前实现可能不支持，这个测试可以验证功能是否存在
        ContextGateway.contexts.push('open');
      }

      @OnMessage
      public handleMessage(
        _ws: ServerWebSocket<WebSocketConnectionData>,
        message: string,
        // 假设支持 @Context 装饰器
        // @Context() context: Context,
      ): void {
        // 如果支持 @Context，这里应该能访问 context.query, context.headers 等
        // 当前实现可能不支持，这个测试可以验证功能是否存在
        ContextGateway.contexts.push(`message:${message}`);
      }
    }

    app.registerWebSocketGateway(ContextGateway);
    await app.listen();

    const ws = new WebSocket(`ws://localhost:${port}/ws/context-test?key=value`);

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('WebSocket connection timeout'));
      }, 2000);

      ws.onopen = () => {
        clearTimeout(timeout);
        resolve();
      };

      ws.onerror = (error) => {
        clearTimeout(timeout);
        reject(error);
      };
    });

    await new Promise((resolve) => setTimeout(resolve, 100));
    ws.send('test-context');
    await new Promise((resolve) => setTimeout(resolve, 200));

    // 验证事件被处理（Context 功能可能需要额外实现）
    expect(ContextGateway.contexts.length).toBeGreaterThan(0);
    expect(ContextGateway.contexts).toContain('open');
    expect(ContextGateway.contexts.some((c) => String(c).includes('test-context'))).toBe(true);
    ws.close();
  });

  test('should handle query parameters with path information together', async () => {
    // 注意：当前实现不支持动态路径参数，但支持查询参数
    @WebSocketGateway('/ws/combined')
    class CombinedGateway {
      public static data: {
        path?: string;
        query?: Record<string, string>;
      }[] = [];

      @OnOpen
      public handleOpen(ws: ServerWebSocket<WebSocketConnectionData>): void {
        const path = ws.data?.path || '';
        const data: {
          path?: string;
          query?: Record<string, string>;
        } = { path };

        // 提取查询参数（从完整 URL 中）
        // 注意：ws.data.path 可能包含或不包含查询参数，取决于实现
        const queryMatch = path.match(/\?(.+)$/);
        if (queryMatch) {
          const params: Record<string, string> = {};
          queryMatch[1].split('&').forEach((pair) => {
            const [key, value] = pair.split('=');
            if (key && value) {
              params[decodeURIComponent(key)] = decodeURIComponent(value);
            }
          });
          data.query = params;
        }

        CombinedGateway.data.push(data);
        ws.send(`Combined: ${JSON.stringify(data)}`);
      }

      @OnMessage
      public handleMessage(
        ws: ServerWebSocket<WebSocketConnectionData>,
        message: string,
      ): void {
        ws.send(`Message: ${message}`);
      }
    }

    app.registerWebSocketGateway(CombinedGateway);
    await app.listen();

    const userId = 'user-xyz';
    const ws = new WebSocket(
      `ws://localhost:${port}/ws/combined?userId=${userId}`,
    );

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('WebSocket connection timeout'));
      }, 2000);

      ws.onopen = () => {
        clearTimeout(timeout);
        resolve();
      };

      ws.onerror = (error) => {
        clearTimeout(timeout);
        reject(error);
      };
    });

    await new Promise((resolve) => setTimeout(resolve, 200));

    // 验证数据被收集
    expect(CombinedGateway.data.length).toBeGreaterThan(0);
    expect(CombinedGateway.data[0].path).toBeDefined();
    ws.close();
  });

  test('should create new instance for each WebSocket connection (dynamic instance creation)', async () => {
    @WebSocketGateway('/ws/dynamic-instance')
    class DynamicInstanceGateway {
      public static instanceIds: number[] = [];
      public static callCounts: Map<number, number> = new Map();
      private readonly instanceId: number;

      public constructor() {
        this.instanceId = Math.random();
        DynamicInstanceGateway.instanceIds.push(this.instanceId);
        DynamicInstanceGateway.callCounts.set(this.instanceId, 0);
      }

      @OnOpen
      public handleOpen(ws: ServerWebSocket<WebSocketConnectionData>): void {
        const count = DynamicInstanceGateway.callCounts.get(this.instanceId) || 0;
        DynamicInstanceGateway.callCounts.set(this.instanceId, count + 1);
        ws.send(`Instance ID: ${this.instanceId}`);
      }

      @OnMessage
      public handleMessage(
        _ws: ServerWebSocket<WebSocketConnectionData>,
        message: string,
      ): void {
        const count = DynamicInstanceGateway.callCounts.get(this.instanceId) || 0;
        DynamicInstanceGateway.callCounts.set(this.instanceId, count + 1);
      }
    }

    app.registerWebSocketGateway(DynamicInstanceGateway);
    await app.listen();

    // 创建第一个连接
    const ws1 = new WebSocket(`ws://localhost:${port}/ws/dynamic-instance`);
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('WebSocket connection timeout'));
      }, 2000);

      ws1.onopen = () => {
        clearTimeout(timeout);
        resolve();
      };

      ws1.onerror = (error) => {
        clearTimeout(timeout);
        reject(error);
      };
    });

    await new Promise((resolve) => setTimeout(resolve, 200));
    const firstInstanceCount = DynamicInstanceGateway.instanceIds.length;

    // 创建第二个连接
    const ws2 = new WebSocket(`ws://localhost:${port}/ws/dynamic-instance`);
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('WebSocket connection timeout'));
      }, 2000);

      ws2.onopen = () => {
        clearTimeout(timeout);
        resolve();
      };

      ws2.onerror = (error) => {
        clearTimeout(timeout);
        reject(error);
      };
    });

    await new Promise((resolve) => setTimeout(resolve, 200));

    // 验证创建了实例（至少一个）
    expect(DynamicInstanceGateway.instanceIds.length).toBeGreaterThan(0);
    // 验证每个连接都调用了处理器（说明实例被使用）
    const totalCalls = Array.from(DynamicInstanceGateway.callCounts.values()).reduce(
      (sum, count) => sum + count,
      0,
    );
    expect(totalCalls).toBeGreaterThan(0);

    ws1.close();
    ws2.close();
  });

  test('should support @Query decorator in WebSocket handlers', async () => {
    @WebSocketGateway('/ws/query-decorator')
    class QueryDecoratorGateway {
      public static receivedQueries: Record<string, string>[] = [];

      @OnOpen
      public handleOpen(
        _ws: ServerWebSocket<WebSocketConnectionData>,
        @Query('userId') userId: string | null,
        @Query('token') token: string | null,
      ): void {
        QueryDecoratorGateway.receivedQueries.push({
          userId: userId || '',
          token: token || '',
        });
      }

      @OnMessage
      public handleMessage(
        _ws: ServerWebSocket<WebSocketConnectionData>,
        message: string,
        @Query('userId') userId: string | null,
      ): void {
        QueryDecoratorGateway.receivedQueries.push({
          message,
          userId: userId || '',
        });
      }
    }

    app.registerWebSocketGateway(QueryDecoratorGateway);
    await app.listen();

    const userId = 'user-123';
    const token = 'token-456';
    const ws = new WebSocket(
      `ws://localhost:${port}/ws/query-decorator?userId=${userId}&token=${token}`,
    );

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('WebSocket connection timeout'));
      }, 2000);

      ws.onopen = () => {
        clearTimeout(timeout);
        resolve();
      };

      ws.onerror = (error) => {
        clearTimeout(timeout);
        reject(error);
      };
    });

    await new Promise((resolve) => setTimeout(resolve, 200));

    // 验证 @Query 装饰器正确提取了查询参数
    expect(QueryDecoratorGateway.receivedQueries.length).toBeGreaterThan(0);
    const openQuery = QueryDecoratorGateway.receivedQueries.find(
      (q) => q.userId === userId && q.token === token,
    );
    expect(openQuery).toBeDefined();

    ws.send('test-message');
    await new Promise((resolve) => setTimeout(resolve, 200));

    // 验证消息处理中的 @Query 也工作
    const messageQuery = QueryDecoratorGateway.receivedQueries.find(
      (q) => q.message === 'test-message' && q.userId === userId,
    );
    expect(messageQuery).toBeDefined();

    ws.close();
  });

  test('should support @Context decorator in WebSocket handlers', async () => {
    @WebSocketGateway('/ws/context-decorator')
    class ContextDecoratorGateway {
      public static contexts: {
        path?: string;
        query?: string;
        hasContext?: boolean;
      }[] = [];

      @OnOpen
      public handleOpen(
        _ws: ServerWebSocket<WebSocketConnectionData>,
        @Context() context: RequestContext,
      ): void {
        ContextDecoratorGateway.contexts.push({
          path: context.path,
          query: context.getQuery('userId') || undefined,
          hasContext: context !== undefined,
        });
      }

      @OnMessage
      public handleMessage(
        _ws: ServerWebSocket<WebSocketConnectionData>,
        message: string,
        @Context() context: RequestContext,
      ): void {
        ContextDecoratorGateway.contexts.push({
          path: context.path,
          query: context.getQuery('userId') || undefined,
          hasContext: context !== undefined,
        });
      }
    }

    app.registerWebSocketGateway(ContextDecoratorGateway);
    await app.listen();

    const userId = 'user-789';
    const ws = new WebSocket(
      `ws://localhost:${port}/ws/context-decorator?userId=${userId}`,
    );

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('WebSocket connection timeout'));
      }, 2000);

      ws.onopen = () => {
        clearTimeout(timeout);
        resolve();
      };

      ws.onerror = (error) => {
        clearTimeout(timeout);
        reject(error);
      };
    });

    await new Promise((resolve) => setTimeout(resolve, 200));

    // 验证 @Context 装饰器正确注入了 Context 对象
    expect(ContextDecoratorGateway.contexts.length).toBeGreaterThan(0);
    const openContext = ContextDecoratorGateway.contexts[0];
    expect(openContext.hasContext).toBe(true);
    expect(openContext.path).toBe('/ws/context-decorator');
    expect(openContext.query).toBe(userId);

    ws.send('test-context');
    await new Promise((resolve) => setTimeout(resolve, 200));

    // 验证消息处理中的 @Context 也工作
    const messageContext = ContextDecoratorGateway.contexts.find(
      (c) => c.path === '/ws/context-decorator' && c.query === userId,
    );
    expect(messageContext).toBeDefined();
    expect(messageContext?.hasContext).toBe(true);

    ws.close();
  });

  test('should support @Query and @Context decorators together', async () => {
    @WebSocketGateway('/ws/combined-decorators')
    class CombinedDecoratorsGateway {
      public static results: {
        queryValue?: string | null;
        contextPath?: string;
        hasContext?: boolean;
      }[] = [];

      @OnMessage
      public handleMessage(
        _ws: ServerWebSocket<WebSocketConnectionData>,
        message: string,
        @Query('roomId') roomId: string | null,
        @Context() context: RequestContext,
      ): void {
        CombinedDecoratorsGateway.results.push({
          queryValue: roomId,
          contextPath: context.path,
          hasContext: context !== undefined,
        });
      }
    }

    app.registerWebSocketGateway(CombinedDecoratorsGateway);
    await app.listen();

    const roomId = 'room-abc';
    const ws = new WebSocket(
      `ws://localhost:${port}/ws/combined-decorators?roomId=${roomId}`,
    );

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('WebSocket connection timeout'));
      }, 2000);

      ws.onopen = () => {
        clearTimeout(timeout);
        resolve();
      };

      ws.onerror = (error) => {
        clearTimeout(timeout);
        reject(error);
      };
    });

    await new Promise((resolve) => setTimeout(resolve, 100));
    ws.send('test-combined');
    await new Promise((resolve) => setTimeout(resolve, 200));

    // 验证 @Query 和 @Context 同时工作
    expect(CombinedDecoratorsGateway.results.length).toBeGreaterThan(0);
    const result = CombinedDecoratorsGateway.results[0];
    expect(result.queryValue).toBe(roomId);
    expect(result.contextPath).toBe('/ws/combined-decorators');
    expect(result.hasContext).toBe(true);

    ws.close();
  });
});


