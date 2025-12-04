import { describe, expect, test, beforeEach, afterEach } from 'bun:test';
import type { ServerWebSocket } from 'bun';

import { WebSocketGateway, OnOpen, OnMessage, OnClose } from '../../src/websocket/decorators';
import { WebSocketGatewayRegistry } from '../../src/websocket/registry';
import { ControllerRegistry } from '../../src/controller/controller';
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


