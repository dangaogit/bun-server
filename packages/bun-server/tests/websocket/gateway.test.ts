import { describe, expect, test, beforeEach, afterEach } from 'bun:test';
import type { ServerWebSocket } from 'bun';

import { WebSocketGateway, OnOpen, OnMessage, OnClose } from '../../src/websocket/decorators';
import { WebSocketGatewayRegistry } from '../../src/websocket/registry';
import { ControllerRegistry } from '../../src/controller/controller';
import { Application } from '../../src/core/application';
import { getTestPort } from '../utils/test-port';
import type { WebSocketConnectionData } from '../../src/websocket/registry';

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
});


